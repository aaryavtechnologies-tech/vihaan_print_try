"use client";

import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Save, Loader2 } from "lucide-react";
import { createStudent } from "../server/student-actions";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";

import { StJohnTemplatePreview, StudentCardData } from "./st-john-template-preview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Auto uppercase transformation in Zod or handle it on change. 
// We will transform string values to uppercase in zod schema and input values.
const studentSchema = z.object({
  schoolId: z.string().optional(),
  studentId: z.string().optional(),
  admissionNo: z.string().optional(),
  studentName: z.string().min(1, "Student Name is required"),
  dob: z.string().min(1, "Date of Birth is required"), 
  className: z.string().min(1, "Class is required"),
  fatherName: z.string().min(1, "Father's Name is required"),
  mobile: z.string().min(10, "Valid mobile required"),
  addressLine1: z.string().min(1, "Address is required"),
  photoUrl: z.string().min(1, "Photo is required"),
  signatureUrl: z.string().optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export function StJohnWizard({ schoolId = "STJOHN-9780" }: { schoolId?: string }) {
  const [wizardStep, setWizardStep] = useState<"filling" | "previewing">("filling");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const methods = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      schoolId: "", // Will be assigned on server or hidden
      studentId: "",
      studentName: "",
      dob: "",
      className: "",
      fatherName: "",
      mobile: "",
      addressLine1: "",
      photoUrl: "",
      signatureUrl: "",
    },
    mode: "onChange"
  });

  const { handleSubmit, watch, register, setValue, reset, formState: { errors } } = methods;
  
  const formValues = watch();

  // Helper to force uppercase on input
  const handleUppercaseChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: any) => {
    setValue(fieldName, e.target.value.toUpperCase(), { shouldValidate: true, shouldDirty: true });
  };

  const previewData: StudentCardData = {
    studentName: (formValues.studentName || "").trim().toUpperCase(),
    fatherName: formValues.fatherName?.toUpperCase(),
    className: formValues.className?.toUpperCase(),
    dob: formValues.dob,
    mobile: formValues.mobile,
    address: formValues.addressLine1?.toUpperCase(),
    photoUrl: formValues.photoUrl,
    principalSignUrl: formValues.signatureUrl,
    schoolId: schoolId,
  };

  const onFormValid = (data: StudentFormData) => {
    // Instead of submitting, move to preview step
    setWizardStep("previewing");
  };

  const confirmAndSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = methods.getValues();
      // Assign the schoolId that was passed in (from login cookie)
      data.schoolId = schoolId; 
      const res = await createStudent(data);
      if (res.success) {
        setIsSuccess(true);
      } else {
        toast.error(res.error || "Failed to add student");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setWizardStep("filling");
    setIsSuccess(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <Save className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Success!</h2>
        <p className="text-lg text-slate-600 mb-6">Your details have been submitted and the ID card is ready for printing.</p>
        <Button onClick={handleReset} variant="outline" className="px-8 h-12">Submit Another Student</Button>
      </div>
    );
  }

  if (wizardStep === "previewing") {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-6 md:p-10 flex flex-col items-center">
            <div className="mb-8 text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800">Verify Student Details</h2>
              <p className="text-slate-500 mt-2">Please review the entered information carefully before submitting.</p>
            </div>
            
            <div className="bg-slate-50 w-full rounded-2xl p-6 sm:p-8 mb-8 border border-slate-200/60 shadow-sm text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Student Name</h3>
                  <p className="text-lg font-bold text-slate-900 uppercase">{previewData.studentName || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Father's Name</h3>
                  <p className="text-lg font-medium text-slate-800 uppercase">{previewData.fatherName || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Class</h3>
                  <p className="text-lg font-medium text-slate-800 uppercase">{previewData.className || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Date of Birth</h3>
                  <p className="text-lg font-medium text-slate-800">{previewData.dob ? String(previewData.dob) : "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</h3>
                  <p className="text-lg font-medium text-slate-800">{previewData.mobile || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Address</h3>
                  <p className="text-lg font-medium text-slate-800 uppercase">{previewData.address || "-"}</p>
                </div>
                {previewData.photoUrl && (
                  <div className="md:col-span-2 mt-4 pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Uploaded Photo</h3>
                    <img src={previewData.photoUrl} alt="Student" className="w-32 h-40 object-cover rounded-xl shadow-md border-2 border-white bg-white" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
               <Button 
                 variant="outline" 
                 onClick={() => setWizardStep("filling")}
                 disabled={isSubmitting}
                 className="flex-1 h-14 rounded-xl text-lg font-semibold"
               >
                 Edit Details
               </Button>
               <Button 
                 onClick={confirmAndSubmit}
                 disabled={isSubmitting}
                 className="flex-1 h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xl font-bold text-lg"
               >
                 {isSubmitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                 Confirm & Submit
               </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="border-slate-200/60 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/50 backdrop-blur-xl">
        <CardContent className="p-4 md:p-6 md:px-8">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-extrabold text-slate-800">Student Details</h2>
            <p className="text-sm text-slate-500 mt-1">Fill in the details below. All fields will be auto-capitalized for printing.</p>
          </div>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onFormValid)} className="space-y-6">
              
              <input type="hidden" {...register("photoUrl")} />
              <input type="hidden" {...register("signatureUrl")} />
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                
                {/* Left side: Form fields */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-700 font-semibold">Student Name <span className="text-red-500">*</span></Label>
                    <Input 
                      className="h-11 rounded-xl border-slate-200 bg-white uppercase shadow-sm" 
                      {...register("studentName")} 
                      onChange={(e) => handleUppercaseChange(e, "studentName")}
                      placeholder="FULL NAME" 
                    />
                    {errors.studentName && <span className="text-xs text-red-500 font-medium">{errors.studentName.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-700 font-semibold">Father's Name <span className="text-red-500">*</span></Label>
                    <Input 
                      className="h-11 rounded-xl border-slate-200 bg-white uppercase shadow-sm" 
                      {...register("fatherName")} 
                      onChange={(e) => handleUppercaseChange(e, "fatherName")}
                      placeholder="FATHER'S FULL NAME" 
                    />
                    {errors.fatherName && <span className="text-xs text-red-500 font-medium">{errors.fatherName.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-700 font-semibold">Date of Birth <span className="text-red-500">*</span></Label>
                    <Input className="h-11 rounded-xl border-slate-200 bg-white shadow-sm" type="text" placeholder="DD/MM/YYYY" {...register("dob")} />
                    {errors.dob && <span className="text-xs text-red-500 font-medium">{errors.dob.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-700 font-semibold">Class / Grade <span className="text-red-500">*</span></Label>
                    <Input 
                      className="h-11 rounded-xl border-slate-200 bg-white uppercase shadow-sm" 
                      {...register("className")} 
                      onChange={(e) => handleUppercaseChange(e, "className")}
                      placeholder="E.G. 10TH GRADE" 
                    />
                    {errors.className && <span className="text-xs text-red-500 font-medium">{errors.className.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm text-slate-700 font-semibold">Mobile Number <span className="text-red-500">*</span></Label>
                    <Input className="h-11 rounded-xl border-slate-200 bg-white shadow-sm" {...register("mobile")} placeholder="e.g. 9876543210" />
                    {errors.mobile && <span className="text-xs text-red-500 font-medium">{errors.mobile.message}</span>}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-sm text-slate-700 font-semibold">Full Address <span className="text-red-500">*</span></Label>
                    <Input 
                      className="h-11 rounded-xl border-slate-200 bg-white uppercase shadow-sm" 
                      {...register("addressLine1")} 
                      onChange={(e) => handleUppercaseChange(e, "addressLine1")}
                      placeholder="HOUSE NO, STREET, CITY" 
                    />
                    {errors.addressLine1 && <span className="text-xs text-red-500 font-medium">{errors.addressLine1.message}</span>}
                  </div>
                </div>

                {/* Right side: Photo upload */}
                <div className="lg:col-span-4 h-fit bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-center">
                  <Label className="text-sm text-slate-800 font-bold mb-3 block">Student Photo <span className="text-red-500">*</span></Label>
                  <ImageUpload 
                    value={formValues.photoUrl} 
                    onChange={(url) => methods.setValue("photoUrl", url, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
                    label="Click or drag photo here"
                    folder="vihaan_id_print/students"
                  />
                  {errors.photoUrl && <span className="text-xs text-red-500 font-medium block mt-2 text-center">{errors.photoUrl.message}</span>}
                  <p className="text-xs text-slate-500 mt-4 text-center font-medium">✨ Passport Size (1.25" × 1.75")</p>
                </div>
                
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all font-bold text-lg"
                >
                  Review ID Card Preview
                </Button>
              </div>

            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
}
