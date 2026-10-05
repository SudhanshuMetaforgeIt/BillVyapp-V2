-- Reuse Franchise.code. Names never participate in coupon issuance.
-- Normalization is stable and collisions receive a deterministic disambiguator.
DROP PROCEDURE IF EXISTS migrate_membership_short_coupons;
CREATE PROCEDURE migrate_membership_short_coupons()
BEGIN
  DECLARE finished INT DEFAULT 0;
  DECLARE franchise_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE old_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE prefix_code VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE member_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE new_coupon VARCHAR(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE digest CHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  DECLARE attempt_no INT DEFAULT 0;
  DECLARE char_no INT DEFAULT 0;
  DECLARE alphabet VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  DECLARE franchise_cursor CURSOR FOR SELECT id, code FROM franchises ORDER BY id;
  DECLARE member_cursor CURSOR FOR
    SELECT m.id, f.code FROM memberships m
    JOIN membership_plans p ON p.id = m.membershipPlanId
    JOIN salons s ON s.id = p.salonId
    JOIN franchises f ON f.id = s.franchiseId ORDER BY m.id;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET finished = 1;

  OPEN franchise_cursor;
  franchise_loop: LOOP
    FETCH franchise_cursor INTO franchise_id, old_code;
    IF finished = 1 THEN LEAVE franchise_loop; END IF;
    SET prefix_code = REGEXP_REPLACE(UPPER(TRIM(old_code)), '[^A-Z0-9]', '');
    IF prefix_code = '' THEN SET prefix_code = 'FRANCHISE'; END IF;
    SET attempt_no = 0;
    WHILE EXISTS (SELECT 1 FROM franchises WHERE code = prefix_code AND id <> franchise_id) DO
      SET attempt_no = attempt_no + 1;
      SET prefix_code = CONCAT(LEFT(REGEXP_REPLACE(UPPER(TRIM(old_code)), '[^A-Z0-9]', ''), 30),
        UPPER(LEFT(SHA2(CONCAT(franchise_id, ':', attempt_no), 256), 16)));
    END WHILE;
    UPDATE franchises SET code = prefix_code WHERE id = franchise_id;
  END LOOP;
  CLOSE franchise_cursor;

  SET finished = 0;
  OPEN member_cursor;
  member_loop: LOOP
    FETCH member_cursor INTO member_id, prefix_code;
    IF finished = 1 THEN LEAVE member_loop; END IF;
    SET attempt_no = 0;
    coupon_loop: LOOP
      -- Deterministic migration candidates, never a truncated legacy coupon or ID.
      SET digest = SHA2(CONCAT('franchise-short-coupon-v1:', member_id, ':', attempt_no), 256);
      SET new_coupon = CONCAT(prefix_code, '-');
      SET char_no = 0;
      WHILE char_no < 6 DO
        SET new_coupon = CONCAT(new_coupon, SUBSTRING(alphabet,
          MOD(CONV(SUBSTRING(digest, char_no * 2 + 1, 2), 16, 10), 32) + 1, 1));
        SET char_no = char_no + 1;
      END WHILE;
      IF NOT EXISTS (SELECT 1 FROM memberships WHERE couponCode = new_coupon AND id <> member_id) THEN
        LEAVE coupon_loop;
      END IF;
      SET attempt_no = attempt_no + 1;
    END LOOP;
    UPDATE memberships SET couponCode = new_coupon WHERE id = member_id;
  END LOOP;
  CLOSE member_cursor;
  -- History references the same membership; align its recorded coupon text.
  UPDATE membership_redemptions r JOIN memberships m ON m.id = r.membershipId
    SET r.couponCode = m.couponCode;
END;
CALL migrate_membership_short_coupons();
DROP PROCEDURE migrate_membership_short_coupons;
