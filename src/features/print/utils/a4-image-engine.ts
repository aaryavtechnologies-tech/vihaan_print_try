import JSZip from "jszip";

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
    
    // For local dev, proxy might be needed to avoid canvas taint if images are cross-origin,
    // but Cloudinary allows anonymous cors. We'll add proxy just in case.
    if (url.startsWith('http')) {
      // Cache-bust external URLs to prevent Safari from serving a cached non-CORS response
      const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`;
      const separator = proxyUrl.includes('?') ? '&' : '?';
      img.src = `${proxyUrl}${separator}cors=1`;
    } else {
      img.src = url;
    }
  });
};

interface GenerateA4ImagesParams {
  cards: any[];
  template: any;
  onProgress?: (progress: number) => void;
}

export async function generateA4Images({ cards, template, onProgress }: GenerateA4ImagesParams): Promise<Blob[]> {
  const A4_WIDTH = 2480;  // 300 DPI A4
  const A4_HEIGHT = 3508;
  
  // Standard CR80 dimensions in mm
  const cardW_mm = template?.width || 86; // St John template is landscape (86x54)
  const cardH_mm = template?.height || 54;
  
  // Convert to pixels at 300 DPI
  const cardW_px = Math.round((cardW_mm / 25.4) * 300);
  const cardH_px = Math.round((cardH_mm / 25.4) * 300);

  // We want a 2x2 grid (4 cards per page)
  const cols = 2;
  const rows = 2;
  const cardsPerPage = cols * rows;
  const gap_px = Math.round((5 / 25.4) * 300); // 5mm gap
  
  const gridW = (cols * cardW_px) + ((cols - 1) * gap_px);
  const gridH = (rows * cardH_px) + ((rows - 1) * gap_px);
  
  const startX = (A4_WIDTH - gridW) / 2;
  const startY = (A4_HEIGHT - gridH) / 2;

  const totalPages = Math.ceil(cards.length / cardsPerPage);
  const generatedBlobs: Blob[] = [];

  for (let p = 0; p < totalPages; p++) {
    // Create an off-screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = A4_WIDTH;
    canvas.height = A4_HEIGHT;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error("Could not create canvas context");
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
    
    const pageStartIndex = p * cardsPerPage;
    const pageCards = cards.slice(pageStartIndex, pageStartIndex + cardsPerPage);
    
    for (let i = 0; i < pageCards.length; i++) {
      const card = pageCards[i];
      if (!card.frontImage) continue;

      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = startX + (col * (cardW_px + gap_px));
      const y = startY + (row * (cardH_px + gap_px));

      try {
        const img = await loadImage(card.frontImage);
        ctx.drawImage(img, x, y, cardW_px, cardH_px);
        
        // Draw a light gray border around the card for cutting guides
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, cardW_px, cardH_px);
      } catch (e) {
        console.warn(e);
      }
    }
    
    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
    });
    
    if (blob) {
      generatedBlobs.push(blob);
    }
    
    if (onProgress) {
      onProgress(((p + 1) / totalPages) * 100);
    }
  }

  return generatedBlobs;
}
