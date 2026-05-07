-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `refreshTokenHash` VARCHAR(255) NULL,
    `fullName` VARCHAR(120) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` ENUM('CUSTOMER', 'FREELANCER', 'ARBITER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `roleId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserRole_roleId_userId_idx`(`roleId`, `userId`),
    UNIQUE INDEX `UserRole_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobListing` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NOT NULL,
    `budgetMin` DECIMAL(12, 2) NULL,
    `budgetMax` DECIMAL(12, 2) NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
    `deadlineAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'OPEN', 'IN_PROGRESS', 'CLOSED', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `publishedAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JobListing_customerId_status_createdAt_idx`(`customerId`, `status`, `createdAt`),
    INDEX `JobListing_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bid` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobListingId` INTEGER NOT NULL,
    `freelancerId` INTEGER NOT NULL,
    `coverLetter` TEXT NULL,
    `proposedAmount` DECIMAL(12, 2) NOT NULL,
    `deliveryDays` INTEGER NULL,
    `status` ENUM('ACTIVE', 'WITHDRAWN', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    `activeKey` VARCHAR(64) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `withdrawnAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bid_activeKey_key`(`activeKey`),
    INDEX `Bid_jobListingId_status_createdAt_idx`(`jobListingId`, `status`, `createdAt`),
    INDEX `Bid_freelancerId_status_createdAt_idx`(`freelancerId`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Project` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobListingId` INTEGER NOT NULL,
    `acceptedBidId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `freelancerId` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `summary` TEXT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'TRY',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Project_jobListingId_key`(`jobListingId`),
    UNIQUE INDEX `Project_acceptedBidId_key`(`acceptedBidId`),
    INDEX `Project_customerId_status_createdAt_idx`(`customerId`, `status`, `createdAt`),
    INDEX `Project_freelancerId_status_createdAt_idx`(`freelancerId`, `status`, `createdAt`),
    INDEX `Project_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Milestone` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `projectId` INTEGER NOT NULL,
    `title` VARCHAR(180) NOT NULL,
    `description` TEXT NULL,
    `sequence` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `dueDate` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'OVERDUE', 'CANCELED') NOT NULL DEFAULT 'PENDING',
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Milestone_projectId_status_dueDate_idx`(`projectId`, `status`, `dueDate`),
    UNIQUE INDEX `Milestone_projectId_sequence_key`(`projectId`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Delivery` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `milestoneId` INTEGER NOT NULL,
    `submittedById` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `submissionUrl` VARCHAR(500) NOT NULL,
    `note` TEXT NULL,
    `status` ENUM('SUBMITTED', 'APPROVED', 'REVISION_REQUESTED') NOT NULL DEFAULT 'SUBMITTED',
    `revisionReason` TEXT NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Delivery_milestoneId_createdAt_idx`(`milestoneId`, `createdAt`),
    INDEX `Delivery_submittedById_createdAt_idx`(`submittedById`, `createdAt`),
    UNIQUE INDEX `Delivery_milestoneId_version_key`(`milestoneId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `milestoneId` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL,
    `status` ENUM('PENDING', 'RELEASED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `releasedAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `refundReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_milestoneId_key`(`milestoneId`),
    INDEX `Payment_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobListing` ADD CONSTRAINT `JobListing_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_jobListingId_fkey` FOREIGN KEY (`jobListingId`) REFERENCES `JobListing`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bid` ADD CONSTRAINT `Bid_freelancerId_fkey` FOREIGN KEY (`freelancerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_jobListingId_fkey` FOREIGN KEY (`jobListingId`) REFERENCES `JobListing`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_acceptedBidId_fkey` FOREIGN KEY (`acceptedBidId`) REFERENCES `Bid`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Project` ADD CONSTRAINT `Project_freelancerId_fkey` FOREIGN KEY (`freelancerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `Milestone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Delivery` ADD CONSTRAINT `Delivery_submittedById_fkey` FOREIGN KEY (`submittedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `Milestone`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
