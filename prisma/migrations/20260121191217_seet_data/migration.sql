-- AlterTable
ALTER TABLE "Menu" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;
