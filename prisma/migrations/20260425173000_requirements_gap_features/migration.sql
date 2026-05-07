-- Extend jobs for category and skills filtering
ALTER TABLE `JobListing`
  ADD COLUMN `category` VARCHAR(80) NULL,
  ADD COLUMN `skills` JSON NULL;

CREATE INDEX `JobListing_category_status_createdAt_idx`
  ON `JobListing`(`category`, `status`, `createdAt`);

-- Extend deliveries with file metadata
ALTER TABLE `Delivery`
  ADD COLUMN `fileName` VARCHAR(255) NULL,
  ADD COLUMN `mimeType` VARCHAR(120) NULL,
  ADD COLUMN `fileSizeBytes` INTEGER NULL;

-- Extend disputes with evidence list and arbiter assignment
ALTER TABLE `Dispute`
  ADD COLUMN `assignedArbiterId` INTEGER NULL,
  ADD COLUMN `evidenceUrls` JSON NULL;

CREATE INDEX `Dispute_assignedArbiterId_status_createdAt_idx`
  ON `Dispute`(`assignedArbiterId`, `status`, `createdAt`);

ALTER TABLE `Dispute`
  ADD CONSTRAINT `Dispute_assignedArbiterId_fkey`
  FOREIGN KEY (`assignedArbiterId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add user-to-user review records for completed projects
CREATE TABLE `Review` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `projectId` INTEGER NOT NULL,
  `reviewerId` INTEGER NOT NULL,
  `revieweeId` INTEGER NOT NULL,
  `rating` INTEGER NOT NULL,
  `comment` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `Review_projectId_reviewerId_revieweeId_key`(`projectId`, `reviewerId`, `revieweeId`),
  INDEX `Review_revieweeId_createdAt_idx`(`revieweeId`, `createdAt`),
  INDEX `Review_reviewerId_createdAt_idx`(`reviewerId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Review`
  ADD CONSTRAINT `Review_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Review_reviewerId_fkey`
  FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `Review_revieweeId_fkey`
  FOREIGN KEY (`revieweeId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
