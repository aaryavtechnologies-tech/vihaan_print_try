"use server";

import { prisma } from "@/lib/prisma";
import { ImportStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { parseDate } from "@/lib/utils";

export async function createImportJob(data: { schoolId: string; totalRecords: number; fileName: string; fileSize: number }) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    const job = await prisma.importJob.create({
      data: {
        schoolId: data.schoolId,
        userId: session.user.id,
        totalRecords: data.totalRecords,
        fileName: data.fileName,
        fileSize: data.fileSize,
        status: ImportStatus.PROCESSING,
        startedAt: new Date(),
      }
    });

    return { success: true, jobId: job.id };
  } catch (error: any) {
    console.error("Failed to create import job:", error);
    return { success: false, error: error.message };
  }
}

export async function importStudentChunk(jobId: string, chunkData: any[], schoolId: string, templateId?: string) {
  try {
    // 1. Filter out ERROR rows. Only import VALID and WARNING rows.
    const importableData = chunkData.filter(r => r._status !== "ERROR");
    const errorData = chunkData.filter(r => r._status === "ERROR");

    // 2. Perform Batch Insert
    if (importableData.length > 0) {
      await prisma.student.createMany({
        data: importableData.map(row => ({
          schoolId,
          templateId,
          studentId: row.studentId,
          admissionNo: row.admissionNo || null,
          rollNo: row.rollNo || null,
          firstName: row.firstName,
          middleName: row.middleName || null,
          lastName: row.lastName || null,
          fullName: [row.firstName, row.middleName, row.lastName].filter(Boolean).join(" "),
          dateOfBirth: parseDate(row.dob),
          gender: row.gender || null,
          bloodGroup: row.bloodGroup || null,
          studentMobile: row.mobile || null,
          studentEmail: row.email || null,
          addressLine1: row.address || null,
          className: row.class || null,
          section: row.section || null,
          fatherName: row.fatherName || null,
          motherName: row.motherName || null,
          status: "ACTIVE"
        })),
        skipDuplicates: true, // Safety net
      });
    }

    // 3. Log Errors
    if (errorData.length > 0) {
      await prisma.importError.createMany({
        data: errorData.map((row) => ({
          importJobId: jobId,
          studentId: row.studentId || null,
          errorMessage: row._errors?.join(", ") || "Unknown error",
          errorType: "VALIDATION",
          rawData: row,
        }))
      });
    }

    // 4. Update Job Progress
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        importedCount: { increment: importableData.length },
        failedCount: { increment: errorData.length },
      }
    });

    return { success: true, imported: importableData.length, failed: errorData.length };
  } catch (error: any) {
    console.error("Failed to import chunk:", error);
    return { success: false, error: error.message };
  }
}

export async function completeImportJob(jobId: string, status: ImportStatus) {
  try {
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status,
        completedAt: new Date()
      }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
