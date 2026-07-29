
import { format } from "date-fns";

export interface StudentCardData {
  photoUrl?: string;
  studentName?: string;
  fatherName?: string;
  className?: string;
  dob?: Date | string;
  mobile?: string;
  address?: string;
  principalSignUrl?: string;
  schoolId?: string;
}

interface StJohnTemplatePreviewProps {
  data: StudentCardData;
  zoom?: number;
}

/**
 * Appends a cache-buster query parameter to external URLs that will be loaded
 * with crossOrigin="anonymous". This prevents Safari/iOS from serving a cached
 * non-CORS response which would cause the image to fail loading.
 */
function getCorsUrl(url?: string): string {
  if (!url) return "";
  // Data URIs and local paths don't need cache busting
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}cors=1`;
}

export function StJohnTemplatePreview({ data, zoom = 1 }: StJohnTemplatePreviewProps) {
  let formattedDob = "";
  if (data.dob) {
    if (typeof data.dob === 'string') {
      formattedDob = data.dob;
    } else {
      try {
        formattedDob = format(new Date(data.dob), "dd/MM/yyyy");
      } catch {
        // If the date object is invalid, fall back to string representation
        formattedDob = String(data.dob);
      }
    }
  }

  return (
    <div 
      className="bg-white relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-xl border border-slate-200 transform origin-top-left shrink-0" 
      style={{ width: 1016, height: 638, minWidth: 1016, minHeight: 638, zoom: zoom, fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Background Watermark/Pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none mix-blend-multiply"></div>
      
      {/* Top Banner with Image */}
      <div className="absolute top-0 left-0 w-full h-[240px] bg-[#0047ff] shadow-lg flex items-center justify-center text-center overflow-hidden z-10 border-b-[2px] border-[#0047ff]">
        <img 
          src={data.schoolId === "STJOHN-8677" ? "/id-template/header-2.png" : "/id-template/header.png"}
          alt="School Header" 
          className="w-full h-full object-contain object-top" 
        />
      </div>

      {/* Left Blue Curve */}
      <div className="absolute overflow-hidden" style={{ top: 230, left: 0, width: 100, height: 408 }}>
        <svg viewBox="0 0 100 408" className="absolute top-0 left-0 w-full h-full text-[#0e4ee5] z-0" preserveAspectRatio="none">
          <path d="M0,0 Q100,204 0,408 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Title */}
      <div className="absolute flex justify-center z-20" style={{ top: 240, left: 320, width: 650 }}>
        <div className="text-[#D91C1C] font-extrabold text-[36px] uppercase tracking-widest" style={{ fontFamily: 'Arial Black, Impact, sans-serif' }}>
          ID CARD 2026-27
        </div>
      </div>

      <div className="absolute flex items-baseline" style={{ top: 300, left: 320, width: 650 }}>
        <span className="font-bold text-[29px] text-black shrink-0 uppercase tracking-widest mr-3">NAME :</span>
        <span className="text-[33px] text-[#ff0000] font-bold uppercase leading-none flex-1 truncate">{data.studentName || ""}</span>
      </div>

      <div className="absolute flex items-baseline" style={{ top: 360, left: 320, width: 650 }}>
        <span className="font-bold text-[29px] text-black shrink-0 uppercase tracking-widest mr-3">FATHER NAME :</span>
        <span className="text-[29px] text-[#0000ff] font-normal uppercase leading-none flex-1 truncate">{data.fatherName || ""}</span>
      </div>

      <div className="absolute flex items-baseline" style={{ top: 420, left: 320, width: 280 }}>
        <span className="font-bold text-[29px] text-black shrink-0 uppercase tracking-widest mr-3">CLASS :</span>
        <span className="text-[33px] text-[#ff0000] font-bold uppercase leading-none flex-1 truncate">{data.className || ""}</span>
      </div>

      <div className="absolute flex items-baseline" style={{ top: 420, left: 600, width: 350 }}>
        <span className="font-bold text-[29px] text-black shrink-0 uppercase tracking-widest mr-3">DOB :</span>
        <span className="text-[29px] text-[#0000ff] font-normal uppercase leading-none flex-1 truncate">{formattedDob || ""}</span>
      </div>

      <div className="absolute flex items-baseline" style={{ top: 480, left: 320, width: 650 }}>
        <span className="font-bold text-[29px] text-black shrink-0 uppercase tracking-widest mr-3">MOBILE :</span>
        <span className="text-[29px] text-[#ff0000] font-normal uppercase leading-none flex-1 truncate">{data.mobile || ""}</span>
      </div>

      <div className="absolute flex items-start" style={{ top: 530, left: 320, width: 470 }}>
        <span className="font-bold text-[29px] text-black shrink-0 uppercase tracking-widest pt-[2px] mr-3">ADDRESS :</span>
        <span className="text-[21px] text-[#ff0000] font-normal uppercase leading-[1.2] flex-1 break-words">{data.address || ""}</span>
      </div>

      {/* Principal Signature */}
      <div className="absolute flex flex-col items-center justify-center z-30" style={{ top: 490, left: 800, width: 166, height: 100 }}>
        {data.principalSignUrl ? (
           <img src={getCorsUrl(data.principalSignUrl)} alt="Principal Signature" className="object-contain w-full h-full" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
           <img src="/images/principal-sign.png" alt="Principal Signature" className="object-contain w-full h-full" />
        )}
      </div>

      {/* Photo Box */}
      <div className="absolute bg-white z-10 overflow-hidden flex items-center justify-center border-[4px] border-solid border-black shadow-sm" style={{ top: 270, left: 60, width: 220, height: 280 }}>
        {data.photoUrl ? (
          <img src={getCorsUrl(data.photoUrl)} alt="Student" className="w-full h-full object-cover object-top" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).crossOrigin = null; (e.target as HTMLImageElement).src = data.photoUrl || ''; }} />
        ) : (
           <span className="text-slate-400 font-bold uppercase text-sm tracking-widest text-center px-4">Student<br/>Photo</span>
        )}
      </div>

      {/* Bottom Blue Bar */}
      <div className="absolute bottom-0 left-0 w-full h-[30px] bg-[#0e4ee5] z-20"></div>
    </div>
  );
}
