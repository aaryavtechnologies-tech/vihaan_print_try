"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Stage, Layer, Text, Rect, Image as KonvaImage } from "react-konva";
import { EditorElement, TextElement, ShapeElement, PlaceholderElement } from "../../types/element-types";
import { StudentData } from "../../store/print-store";
import { generateQRCode, generateBarcode, replacePlaceholders } from "../../utils/render-utils";

interface OffscreenRendererProps {
  templateWidth: number;
  templateHeight: number;
  backgroundColor: string;
  elements: EditorElement[];
  studentData: StudentData;
  dpi: number;
  onRenderComplete: (dataUrl: string) => void;
  onError: (err: Error) => void;
}

// A helper component to load images asynchronously
const AsyncImage = ({ url, ...props }: any) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => {
      // Fallback: retry without CORS if the cache-busted request also fails
      const fallbackImg = new window.Image();
      fallbackImg.onload = () => setImage(fallbackImg);
      fallbackImg.onerror = () => setImage(null);
      fallbackImg.src = url;
    };
    // Cache-bust external URLs to prevent Safari from serving a cached non-CORS response
    if (url.startsWith("data:") || url.startsWith("/")) {
      img.src = url;
    } else {
      const separator = url.includes("?") ? "&" : "?";
      img.src = `${url}${separator}cors=1`;
    }
  }, [url]);

  if (!image) {
    // If not loaded yet, we could draw a rect, but usually we just wait
    return null; 
  }
  return <KonvaImage image={image} {...props} />;
};

export function OffscreenRenderer({
  templateWidth,
  templateHeight,
  backgroundColor,
  elements,
  studentData,
  dpi,
  onRenderComplete,
  onError
}: OffscreenRendererProps) {
  const stageRef = useRef<any>(null);
  const [processedElements, setProcessedElements] = useState<any[] | null>(null);

  // Phase 1: Process Elements (Placeholders, QR, Barcode)
  useEffect(() => {
    let isMounted = true;

    const process = async () => {
      try {
        const newElements = await Promise.all(elements.map(async (el) => {
          if (el.type === "text") {
            const textEl = el as TextElement;
            return {
              ...textEl,
              text: replacePlaceholders(textEl.text, studentData)
            };
          }

          if (el.type === "placeholder") {
            const placeEl = el as PlaceholderElement;
            if (placeEl.placeholderType === "student_photo" && studentData.student_photo) {
              return {
                ...placeEl,
                type: "image",
                isStudentPhoto: true,
                url: studentData.student_photo,
              };
            }
            if (placeEl.placeholderType === "qr_code") {
              const qrText = studentData.student_id || "UNKNOWN";
              const qrUrl = await generateQRCode(qrText);
              return {
                ...placeEl,
                type: "image",
                url: qrUrl,
              };
            }
            if (placeEl.placeholderType === "barcode") {
              const bcText = studentData.student_id || "UNKNOWN";
              const bcUrl = generateBarcode(bcText);
              return {
                ...placeEl,
                type: "image",
                url: bcUrl,
              };
            }
            // For all other placeholders (student_name, father_name, dob, class, etc.)
            const rawText = replacePlaceholders(`[${placeEl.placeholderType}]`, studentData);
            const resolvedText = rawText === `[${placeEl.placeholderType}]` ? "" : rawText;

            return {
              ...placeEl,
              type: "text",
              text: resolvedText,
              textColor: placeEl.textColor || "#000",
              fontSize: placeEl.fontSize || 16,
              fontFamily: placeEl.fontFamily || "Arial",
              textAlign: placeEl.textAlign || "left",
            };
          }
          return el;
        }));

        if (isMounted) {
          setProcessedElements(newElements);
        }
      } catch (err: any) {
        if (isMounted) onError(err);
      }
    };

    process();
    return () => { isMounted = false; };
  }, [elements, studentData, onError]);

  // Phase 2: Wait for rendering to settle, then extract DataURL
  useEffect(() => {
    if (!processedElements || !stageRef.current) return;
    
    // We add a small delay to ensure all <AsyncImage>s have time to trigger loading.
    // However, <AsyncImage> loading is truly async.
    // A robust solution uses a counter of loaded images, but for simplicity we use a timeout.
    // For production printing, tracking `onload` of every image is required.
    const timer = setTimeout(() => {
      try {
        const pixelRatio = dpi / 72; // Default screen DPI is 72
        const dataUrl = stageRef.current.toDataURL({ pixelRatio });
        onRenderComplete(dataUrl);
      } catch (err: any) {
        onError(err);
      }
    }, 1500); // 1.5s delay to allow images to load

    return () => clearTimeout(timer);
  }, [processedElements, dpi, onRenderComplete, onError]);


  if (!processedElements) return null;

  return (
    <div style={{ position: "absolute", top: "-9999px", left: "-9999px", visibility: "hidden" }}>
      <Stage width={templateWidth} height={templateHeight} ref={stageRef}>
        <Layer>
          {/* Background */}
          <Rect width={templateWidth} height={templateHeight} fill={backgroundColor} />
          
          {/* Elements */}
          {processedElements.map((el) => {
            const commonProps = {
              x: el.x,
              y: el.y,
              width: el.width,
              height: el.height,
              rotation: el.rotation,
              opacity: el.opacity,
              stroke: el.stroke,
              strokeWidth: el.strokeWidth,
            };

            if (el.type === "text") {
              return (
                <React.Fragment key={el.id}>
                  {el.backgroundColor && (
                    <Rect key={`bg-${el.id}`} {...commonProps} fill={el.backgroundColor} />
                  )}
                  <Text
                    key={`text-${el.id}`}
                    {...commonProps}
                    text={el.text}
                    fill={el.textColor}
                    fontSize={el.fontSize}
                    fontFamily={el.fontFamily}
                    fontStyle={el.fontStyle}
                    align={el.textAlign}
                    lineHeight={el.lineHeight}
                    wrap="word"
                  />
                </React.Fragment>
              );
            }
            
            if (el.type === "rectangle") {
              return (
                <Rect
                  key={el.id}
                  {...commonProps}
                  fill={el.fill || "transparent"}
                  stroke={el.stroke || "transparent"}
                  strokeWidth={el.strokeWidth || 0}
                  cornerRadius={el.cornerRadius || 0}
                />
              );
            }
            
            if (el.type === "circle") {
              return (
                <Rect
                  key={el.id}
                  {...commonProps}
                  fill={el.fill || "transparent"}
                  stroke={el.stroke || "transparent"}
                  strokeWidth={el.strokeWidth || 0}
                  cornerRadius={Math.max(el.width, el.height)}
                />
              );
            }
            
            if (el.type === "image") {
              return (
                <React.Fragment key={el.id}>
                  {el.isStudentPhoto && (
                    <Rect key={`bg-${el.id}`} {...commonProps} fill="#ffffff" cornerRadius={el.cornerRadius || 0} />
                  )}
                  <AsyncImage
                    key={`img-${el.id}`}
                    {...commonProps}
                    url={el.url}
                  />
                </React.Fragment>
              );
            }
            
            return null;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
