-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "visitDate" TEXT NOT NULL,
    "clinicName" TEXT NOT NULL,
    "prefecture" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "visitedClinicWebsiteUrl" TEXT,
    "visitedClinicChairCount" INTEGER,
    "visitedClinicStaffCount" INTEGER,
    "visitedClinicNewPatientsPerMonth" INTEGER,
    "visitedClinicSelfPayRate" REAL,
    "visitedClinicRecallCount" INTEGER,
    "visitedClinicInsurancePointsPerMonth" INTEGER,
    "visitedClinicStrengths" TEXT NOT NULL,
    "myClinicName" TEXT,
    "myClinicWebsiteUrl" TEXT,
    "impressivePoints" TEXT NOT NULL DEFAULT '',
    "actionItems" TEXT NOT NULL DEFAULT '[]',
    "pdfData" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recipients" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recipients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "reports_userId_idx" ON "reports"("userId");

-- CreateIndex
CREATE INDEX "reports_visitDate_idx" ON "reports"("visitDate");

-- CreateIndex
CREATE INDEX "recipients_userId_idx" ON "recipients"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recipients_userId_email_key" ON "recipients"("userId", "email");
