"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { StudentStatus } from "@prisma/client";
import { parseDate } from "@/lib/utils";

export async function getStudents(schoolId?: string) {
  try {
    const students = await prisma.student.findMany({
      where: schoolId ? { schoolId } : undefined,
      include: {
        school: { select: { schoolName: true, schoolCode: true } },
        template: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return students;
  } catch (error) {
    console.error("Failed to fetch students:", error);
    return [];
  }
}

export async function getStudentsByIds(ids: string[]) {
  try {
    return await prisma.student.findMany({
      where: { id: { in: ids } },
      include: {
        school: { select: { schoolName: true, schoolCode: true } },
        template: { select: { name: true } }
      }
    });
  } catch (error) {
    console.error("Failed to fetch students by ids:", error);
    return [];
  }
}

export async function getStudentById(id: string) {
  try {
    return await prisma.student.findFirst({
      where: { id },
      include: {
        school: true,
        template: true
      }
    });
  } catch (error) {
    console.error("Failed to fetch student:", error);
    return null;
  }
}

export async function createStudent(data: any) {
  try {
    // Generate full name automatically
    const fullNameParts = data.studentName ? [data.studentName] : [data.firstName, data.middleName, data.lastName].filter(Boolean);
    const fullName = fullNameParts.join(" ").trim().toUpperCase();

    let finalSchoolId = data.schoolId;

    if (!finalSchoolId || finalSchoolId.startsWith("STJOHN-")) {
      // Find STJOHN school or default
      let schoolToUse = await prisma.school.findFirst({
        where: { schoolCode: finalSchoolId }
      });
      
      if (!schoolToUse) {
        schoolToUse = await prisma.school.create({
          data: {
            schoolName: finalSchoolId === "STJOHN-9780" ? "St. John Samaritan School" : `St. John Samaritan School (${finalSchoolId.split('-')[1]})`,
            schoolCode: finalSchoolId,
            email: `admin_${finalSchoolId.toLowerCase()}@stjohn.com`,
            phone: "0000000000",
            addressLine1: "Head Office",
            city: "Default City",
            state: "Default State",
            postalCode: "000000"
          }
        });
      }
      
      finalSchoolId = schoolToUse.id;
    }

    // Generate a studentId if not provided (for public form)
    const finalStudentId = data.studentId && data.studentId.trim() !== "" 
      ? data.studentId 
      : `PUB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // Check for duplicates (only if they actually provided an ID manually)
    if (data.studentId || data.admissionNo) {
      const existing = await prisma.student.findFirst({
        where: {
          schoolId: finalSchoolId,
          OR: [
            { studentId: data.studentId ? data.studentId : undefined },
            { admissionNo: data.admissionNo ? data.admissionNo : undefined },
          ].filter((c): c is any => c !== undefined && Object.values(c)[0] !== undefined)
        }
      });

      if (existing) {
        return { success: false, error: "A student with this ID or Admission Number already exists in the selected school." };
      }
    }

    const student = await prisma.student.create({
      data: {
        studentId: finalStudentId,
        schoolId: finalSchoolId,
        firstName: data.studentName ? data.studentName.toUpperCase() : data.firstName.toUpperCase(),
        middleName: data.middleName ? data.middleName.toUpperCase() : null,
        lastName: data.lastName ? data.lastName.toUpperCase() : null,
        fullName,
        gender: data.gender,
        dateOfBirth: parseDate(data.dob),
        
        className: data.className,
        section: data.section,
        rollNo: data.rollNo,
        
        fatherName: data.fatherName ? data.fatherName.toUpperCase() : null,
        motherName: data.motherName ? data.motherName.toUpperCase() : null,
        
        studentMobile: data.mobile,
        studentEmail: data.email,
        addressLine1: data.addressLine1 ? data.addressLine1.toUpperCase() : null,
        addressLine2: data.addressLine2,
        city: data.city ? data.city.toUpperCase() : null,
        state: data.state,
        postalCode: data.pincode,
        
        photo: data.photoUrl,
        signature: data.signatureUrl,
        
        status: "PENDING"
      }
    });

    revalidatePath("/dashboard/students");
    return { success: true, studentId: student.id };
  } catch (error: any) {
    console.error("Failed to create student:", error);
    return { success: false, error: error.message || "Failed to create student" };
  }
}

export async function deleteStudent(id: string) {
  try {
    await prisma.generatedCard.deleteMany({ where: { studentId: id } });
    await prisma.student.delete({ where: { id } });
    revalidatePath("/dashboard/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete student:", error);
    return { success: false, error: error.message || "Failed to delete student" };
  }
}

export async function bulkDeleteStudents(ids: string[]) {
  try {
    await prisma.generatedCard.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    revalidatePath("/dashboard/students");
    return { success: true, count: ids.length };
  } catch (error: any) {
    console.error("Failed to bulk delete students:", error);
    return { success: false, error: error.message || "Failed to delete students" };
  }
}

import cloudinary from "@/lib/cloudinary";

function getPublicIdFromUrl(url: string) {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  
  let startIndex = uploadIndex + 1;
  if (parts[startIndex].match(/^v\d+$/)) {
    startIndex++;
  }
  
  const pathWithExtension = parts.slice(startIndex).join('/');
  const lastDot = pathWithExtension.lastIndexOf('.');
  if (lastDot === -1) return pathWithExtension;
  return pathWithExtension.substring(0, lastDot);
}

export async function clearStudentImages(studentId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { generatedCards: true }
    });

    if (!student) return { success: false, error: "Student not found" };

    // Clear student photo and signature from Cloudinary
    if (student.photo) {
      const publicId = getPublicIdFromUrl(student.photo);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(console.error);
    }
    if (student.signature) {
      const publicId = getPublicIdFromUrl(student.signature);
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(console.error);
    }

    // Clear generated cards images from Cloudinary
    for (const card of student.generatedCards) {
      if (card.frontImage) {
        const publicId = getPublicIdFromUrl(card.frontImage);
        if (publicId) await cloudinary.uploader.destroy(publicId).catch(console.error);
      }
      if (card.backImage) {
        const publicId = getPublicIdFromUrl(card.backImage);
        if (publicId) await cloudinary.uploader.destroy(publicId).catch(console.error);
      }
    }

    // Update database to remove image references
    await prisma.student.update({
      where: { id: studentId },
      data: { photo: null, signature: null, schoolSignature: null }
    });
    
    // Delete generated card records to fully clear it from DB
    await prisma.generatedCard.deleteMany({
      where: { studentId }
    });

    revalidatePath("/dashboard/students");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to clear student images:", error);
    return { success: false, error: error.message };
  }
}
