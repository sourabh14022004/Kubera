ALTER TABLE "inventory_movements"
DROP CONSTRAINT "inventory_movements_quantity_sign_check";

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_quantity_sign_check"
CHECK (
    (
        "quantity_change" <> 0
        AND (
            (
                "movement_type" = 'STOCK_IN'
                AND "quantity_change" > 0
            )
            OR (
                "movement_type" = 'CHECKOUT'
                AND "quantity_change" < 0
            )
            OR (
                "movement_type" = 'RETURN'
                AND "quantity_change" > 0
            )
            OR (
                "movement_type" = 'MARK_DAMAGED'
                AND "loan_id" IS NULL
                AND "quantity_change" < 0
            )
            OR (
                "movement_type" = 'MARK_LOST'
                AND "loan_id" IS NULL
                AND "quantity_change" < 0
            )
            OR (
                "movement_type" = 'RETIRE'
                AND "quantity_change" < 0
            )
            OR (
                "movement_type" = 'ADJUSTMENT'
            )
        )
    )
    OR (
        "movement_type" IN ('MARK_DAMAGED', 'MARK_LOST')
        AND "loan_id" IS NOT NULL
        AND "quantity_change" = 0
    )
);