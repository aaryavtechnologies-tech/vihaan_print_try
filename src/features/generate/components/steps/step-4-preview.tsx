"use client";

import React, { useEffect, useState, useRef } from "react";
import { useGenerationStore } from "../../store/generation-store";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Stage, Layer, Rect, Text, Image as KonvaImage } from "react-konva";
import { getTemplateForEditor } from "@/features/template-editor/server/template-actions";
import { replacePlaceholders, generateQRCode, generateBarcode } from "@/features/template-editor/utils/render-utils";

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

  if (!image) return null; 
  return <KonvaImage image={image} {...props} />;
};

export function Step4Preview() {
  const { templateId, studentsData, nextStep, prevStep } = useGenerationStore();
  const [template, setTemplate] = useState<any>(null);
  const [processedElements, setProcessedElements] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // We preview the first selected student
  const student = studentsData[0];

  useEffect(() => {
    if (!templateId || !student) return;

    setIsLoading(true);
    getTemplateForEditor(templateId).then(async (template) => {
      if (template && template.currentVersion) {
        setTemplate(template);
        
        // Wait for fonts to be ready
        if (typeof document !== 'undefined') {
          await document.fonts.ready;
        }

        // Use current version JSON
        const jsonData = (template.currentVersion?.jsonData as any) || {};
        const elements = jsonData.elements || [];

        // Map student data to expected format for rendering
        const studentData = {
          student_id: student.studentId,
          admission_no: student.admissionNo,
          student_name: student.fullName,
          class_name: student.className,
          section: student.section,
          student_photo: student.photo,
          father_name: student.fatherName,
          mother_name: student.motherName,
          dob: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "",
          blood_group: student.bloodGroup,
          student_mobile: student.studentMobile,
          address: student.addressLine1,
          school_name: "School Name", // Would come from school data usually
        };

        // Process elements (QR, Barcode, Placeholders)
        const newElements = await Promise.all(elements.map(async (el: any) => {
          if (el.type === "text") {
            return {
              ...el,
              text: replacePlaceholders(el.text, studentData)
            };
          }

          if (el.type === "placeholder") {
            if (el.placeholderType === "student_photo" && studentData.student_photo) {
              return { ...el, type: "image", isStudentPhoto: true, url: studentData.student_photo };
            }
            if (el.placeholderType === "qr_code") {
              const qrText = studentData.student_id || "UNKNOWN";
              const qrUrl = await generateQRCode(qrText);
              return { ...el, type: "image", url: qrUrl };
            }
            if (el.placeholderType === "barcode") {
              const bcText = studentData.student_id || "UNKNOWN";
              const bcUrl = generateBarcode(bcText);
              return { ...el, type: "image", url: bcUrl };
            }
            
            // For all other placeholders (student_name, father_name, dob, class, etc.)
            // Resolve them as text elements
            const rawText = replacePlaceholders(`[${el.placeholderType}]`, studentData);
            // If it returns the placeholder unchanged, make it empty
            const resolvedText = rawText === `[${el.placeholderType}]` ? "" : rawText;
            
            return {
              ...el,
              type: "text",
              text: resolvedText,
              textColor: el.textColor || "#000",
              fontSize: el.fontSize || 16,
              fontFamily: el.fontFamily || "Arial",
              textAlign: el.textAlign || "left",
            };
          }
          return el;
        }));

        setProcessedElements(newElements);
      }
      setIsLoading(false);
    });
  }, [templateId, student]);

  if (isLoading || !processedElements) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500">Generating live preview...</p>
      </div>
    );
  }

  // Calculate scaling for preview to fit nicely
  const canvasW = template.canvasWidth || 638;
  const canvasH = template.canvasHeight || 1016;
  
  // We want to scale the preview down to fit in ~500px height
  const scale = Math.min(1, 500 / canvasH);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Live Preview</h2>
        <p className="text-slate-500">This is how the ID Card will look for the first selected student.</p>
      </div>

      <div className="flex justify-center items-center bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-inner overflow-hidden min-h-[550px]">
        <div 
          className="shadow-2xl bg-white border border-slate-100 overflow-hidden"
          style={{ width: canvasW * scale, height: canvasH * scale }}
        >
          <Stage width={canvasW * scale} height={canvasH * scale} scaleX={scale} scaleY={scale}>
            <Layer>
              <Rect width={canvasW} height={canvasH} fill="#ffffff" />
              
              {processedElements.map((el) => {
                const commonProps = {
                  x: el.x,
                  y: el.y,
                  width: el.width,
                  height: el.height,
                  rotation: el.rotation,
                  opacity: el.opacity,
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
                
                if (el.type === "rectangle" || el.type === "circle") {
                  return (
                    <Rect
                      key={el.id}
                      {...commonProps}
                      fill={el.fill || "transparent"}
                      stroke={el.stroke || "transparent"}
                      strokeWidth={el.strokeWidth || 0}
                      cornerRadius={el.type === "circle" ? Math.max(el.width, el.height) : (el.cornerRadius || 0)}
                    />
                  );
                }
                
                if (el.type === "image") {
                  return (
                    <React.Fragment key={el.id}>
                      {el.isStudentPhoto && (
                        <Rect key={`bg-${el.id}`} {...commonProps} fill="#ffffff" cornerRadius={el.cornerRadius || 0} />
                      )}
                      <AsyncImage key={`img-${el.id}`} {...commonProps} url={el.url} />
                    </React.Fragment>
                  );
                }
                
                return null;
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep} className="h-12 px-8 rounded-xl shadow-sm">
          Back
        </Button>
        <Button 
          onClick={nextStep}
          className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all font-semibold"
        >
          Begin Batch Generation
        </Button>
      </div>
    </div>
  );
}
