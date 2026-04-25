-- Support payment records at project level or milestone level
ALTER TABLE `Payment`
  ADD COLUMN `projectId` INTEGER NULL,
  MODIFY `milestoneId` INTEGER NULL;

CREATE INDEX `Payment_projectId_createdAt_idx`
  ON `Payment`(`projectId`, `createdAt`);

ALTER TABLE `Payment`
  ADD CONSTRAINT `Payment_projectId_fkey`
  FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
