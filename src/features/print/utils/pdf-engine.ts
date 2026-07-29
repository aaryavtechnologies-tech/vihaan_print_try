import { jsPDF } from 'jspdf';
import { LayoutSettings, PrintSettings, DuplexMode } from '../store/print-store';

// Helper to load an image from URL into an HTMLImageElement
const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback: retry without CORS — the image may still render but canvas will be tainted
      const fallbackImg = new Image();
      fallbackImg.onload = () => resolve(fallbackImg);
      fallbackImg.onerror = (e) => reject(new Error(`Failed to load image: ${url}`));
      fallbackImg.src = url;
    };
    // Cache-bust external URLs to prevent Safari from serving a cached non-CORS response
    if (url.startsWith('data:') || url.startsWith('/')) {
      img.src = url;
    } else {
      const separator = url.includes('?') ? '&' : '?';
      img.src = `${url}${separator}cors=1`;
    }
  });
};

interface GeneratePDFParams {
  cards: any[];
  template: any; // Used for dimensions
  layoutSettings: LayoutSettings;
  printSettings: PrintSettings;
  onProgress?: (progress: number) => void;
}

export async function generatePDF({ cards, template, layoutSettings, printSettings, onProgress }: GeneratePDFParams): Promise<Blob> {
  const { layout, margin, gapX, gapY, cropMarks } = layoutSettings;
  const { paperSize, duplex, copies } = printSettings;
  
  // Dimensions map (mm)
  const paperDimensions: Record<string, [number, number]> = {
    A4: [210, 297],
    A3: [297, 420],
    LETTER: [215.9, 279.4],
    LEGAL: [215.9, 355.6],
    CUSTOM: [210, 297]
  };

  const isLandscapeLayout = layout === 'A4_LANDSCAPE';
  const paperW = isLandscapeLayout ? paperDimensions[paperSize][1] : paperDimensions[paperSize][0];
  const paperH = isLandscapeLayout ? paperDimensions[paperSize][0] : paperDimensions[paperSize][1];

  // Card dimensions in mm (standard CR80 is ~ 54 x 86 mm)
  // Get from template or fallback
  const cardW_mm = template?.width || 54;
  const cardH_mm = template?.height || 86;
  const isCardLandscape = template?.orientation === 'landscape';

  // Initialize jsPDF
  const doc = new jsPDF({
    orientation: isLandscapeLayout ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [paperW, paperH],
    compress: true
  });

  if (layout === 'SINGLE_PVC') {
    return generateSinglePVCPDF(doc, cards, cardW_mm, cardH_mm, duplex, copies, onProgress);
  }

  // A4 Layout Calculations
  const usableW = paperW - (margin * 2);
  const usableH = paperH - (margin * 2);
  
  // Calculate how many columns and rows fit
  const cols = Math.floor((usableW + gapX) / (cardW_mm + gapX));
  const rows = Math.floor((usableH + gapY) / (cardH_mm + gapY));
  
  const cardsPerPage = cols * rows;
  if (cardsPerPage < 1) {
    throw new Error("Card dimensions plus margins are too large for the selected paper size.");
  }

  // Calculate actual starting positions to center the grid
  const gridW = (cols * cardW_mm) + ((cols - 1) * gapX);
  const gridH = (rows * cardH_mm) + ((rows - 1) * gapY);
  
  const startX = margin + (usableW - gridW) / 2;
  const startY = margin + (usableH - gridH) / 2;

  // Flatten the cards array if copies > 1
  let printList: any[] = [];
  for (const card of cards) {
    for (let i = 0; i < copies; i++) {
      printList.push(card);
    }
  }

  const totalPages = Math.ceil(printList.length / cardsPerPage);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();
    
    // FRONT PAGE
    const pageStartIndex = p * cardsPerPage;
    const pageCards = printList.slice(pageStartIndex, pageStartIndex + cardsPerPage);
    
    for (let i = 0; i < pageCards.length; i++) {
      const card = pageCards[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = startX + (col * (cardW_mm + gapX));
      const y = startY + (row * (cardH_mm + gapY));

      if (duplex !== 'BACK_ONLY' && card.frontImage) {
        try {
          const img = await loadImage(card.frontImage);
          doc.addImage(img, 'PNG', x, y, cardW_mm, cardH_mm, undefined, 'FAST');
        } catch (e) {
          console.warn(e);
        }
      }

      if (cropMarks) {
        drawCropMarks(doc, x, y, cardW_mm, cardH_mm);
      }
    }
    
    // BACK PAGE (If Duplex)
    if (duplex === 'FRONT_BACK') {
      doc.addPage();
      
      for (let i = 0; i < pageCards.length; i++) {
        const card = pageCards[i];
        
        // For duplex on physical printers, the back side needs to be mirrored horizontally on the grid
        // so that it aligns with the front when flipped.
        const col = i % cols;
        const row = Math.floor(i / cols);
        
        const mirroredCol = (cols - 1) - col; // Mirror the column index!
        
        const x = startX + (mirroredCol * (cardW_mm + gapX));
        const y = startY + (row * (cardH_mm + gapY));

        if (card.backImage) {
          try {
            const img = await loadImage(card.backImage);
            doc.addImage(img, 'PNG', x, y, cardW_mm, cardH_mm, undefined, 'FAST');
          } catch (e) {
            console.warn(e);
          }
        }
        
        if (cropMarks) {
          drawCropMarks(doc, x, y, cardW_mm, cardH_mm);
        }
      }
    }

    if (onProgress) {
      onProgress(((p + 1) / totalPages) * 100);
    }
  }

  return doc.output('blob');
}

async function generateSinglePVCPDF(
  doc: jsPDF, 
  cards: any[], 
  cardW_mm: number, 
  cardH_mm: number, 
  duplex: DuplexMode,
  copies: number,
  onProgress?: (p: number) => void
): Promise<Blob> {
  // Reinitialize doc to match PVC Card size (CR80)
  const pvcDoc = new jsPDF({
    orientation: cardW_mm > cardH_mm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [cardW_mm, cardH_mm],
    compress: true
  });

  let totalProcessed = 0;
  const totalOperations = cards.length * copies;

  for (let c = 0; c < cards.length; c++) {
    const card = cards[c];
    for (let i = 0; i < copies; i++) {
      if (totalProcessed > 0) pvcDoc.addPage();

      if (duplex !== 'BACK_ONLY' && card.frontImage) {
        try {
          const img = await loadImage(card.frontImage);
          pvcDoc.addImage(img, 'PNG', 0, 0, cardW_mm, cardH_mm, undefined, 'FAST');
        } catch (e) { console.warn(e); }
      }

      if (duplex === 'FRONT_BACK' && card.backImage) {
        pvcDoc.addPage();
        try {
          const img = await loadImage(card.backImage);
          pvcDoc.addImage(img, 'PNG', 0, 0, cardW_mm, cardH_mm, undefined, 'FAST');
        } catch (e) { console.warn(e); }
      }

      totalProcessed++;
      if (onProgress) onProgress((totalProcessed / totalOperations) * 100);
    }
  }

  return pvcDoc.output('blob');
}

function drawCropMarks(doc: jsPDF, x: number, y: number, w: number, h: number) {
  const markLength = 3;
  const markOffset = 1;
  
  doc.setLineWidth(0.1);
  doc.setDrawColor(0, 0, 0);

  // Top Left
  doc.line(x - markOffset, y, x - markOffset - markLength, y);
  doc.line(x, y - markOffset, x, y - markOffset - markLength);
  
  // Top Right
  doc.line(x + w + markOffset, y, x + w + markOffset + markLength, y);
  doc.line(x + w, y - markOffset, x + w, y - markOffset - markLength);
  
  // Bottom Left
  doc.line(x - markOffset, y + h, x - markOffset - markLength, y + h);
  doc.line(x, y + h + markOffset, x, y + h + markOffset + markLength);
  
  // Bottom Right
  doc.line(x + w + markOffset, y + h, x + w + markOffset + markLength, y + h);
  doc.line(x + w, y + h + markOffset, x + w, y + h + markOffset + markLength);
}
