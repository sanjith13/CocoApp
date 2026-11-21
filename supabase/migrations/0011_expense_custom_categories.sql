-- Expense categories become free text (the app suggests the defaults and previously used ones).
alter table expenses drop constraint expenses_category_check;
alter table expenses add constraint expenses_category_len check (length(btrim(category)) between 1 and 40);
