-- Seed sample data only. Run this after supabase_schema_seed.sql created tables.
-- This resets demo rows, then inserts enough data for the Android home page.

truncate table
  public."ViewHistory",
  public."OrderItem",
  public."Order",
  public."CartItem",
  public."Cart",
  public."Review",
  public."OTP",
  public."Payment",
  public."Address",
  public."Voucher",
  public."Shipment",
  public."BookPublisher",
  public."BookCategory",
  public."BookAuthor",
  public."BookImages",
  public."Book",
  public."Publishers",
  public."Categories",
  public."Authors",
  public."Customer"
restart identity cascade;

insert into public."Customer" ("customerID", "email", "password", "fullName", "phoneNumber", "joinDay") values
(1, 'demo@bookstore.local', '$2b$10$JgZkEq1PsjjzL6pRICjqVeypWdQSGnCo7AjkK/12HIRq3N1yBOMNi', 'Demo User', '0900000000', now());

insert into public."Authors" ("authorID", "authorName", "biography") values
(1, 'Dale Carnegie', 'Self-help author.'),
(2, 'Paulo Coelho', 'Brazilian novelist.'),
(3, 'J. K. Rowling', 'Fantasy author.'),
(4, 'Yuval Noah Harari', 'Historian and writer.'),
(5, 'Robert Kiyosaki', 'Personal finance author.');

insert into public."Categories" ("categoryID", "categoryName") values
(1, 'Ky nang song'),
(2, 'Tieu thuyet'),
(3, 'Kinh te'),
(4, 'Lich su'),
(5, 'Thieu nhi');

insert into public."Publishers" ("publisherID", "publisherName") values
(1, 'NXB Tre'),
(2, 'NXB Tong hop'),
(3, 'Bloomsbury');

insert into public."Book" ("bookID", "title", "author", "price", "description", "language", "format", "pageCount", "variantLabel", "idGroup", "createdAt") values
(1, 'Dac Nhan Tam', 'Dale Carnegie', 1.20, 'Cuon sach kinh dien ve giao tiep va ung xu.', 'English', 'Paperback', 320, 'Ban thuong', 100, now() - interval '1 day'),
(2, 'Nha Gia Kim', 'Paulo Coelho', 1.05, 'Hanh trinh di tim kho bau va y nghia cuoc song.', 'English', 'Paperback', 240, 'Ban thuong', 101, now() - interval '2 days'),
(3, 'Harry Potter va Hon da Phu thuy', 'J. K. Rowling', 1.50, 'Cau chuyen dau tien ve the gioi phu thuy Harry Potter.', 'English', 'Hardcover', 360, 'Hardcover', 102, now() - interval '3 days'),
(4, 'Sapiens Luoc su loai nguoi', 'Yuval Noah Harari', 1.80, 'Tong quan lich su phat trien cua nhan loai.', 'English', 'Paperback', 520, 'Ban thuong', 103, now() - interval '4 days'),
(5, 'Cha Giau Cha Ngheo', 'Robert Kiyosaki', 1.25, 'Bai hoc tai chinh ca nhan va tu duy dau tu.', 'English', 'Paperback', 336, 'Ban thuong', 104, now() - interval '5 days'),
(6, 'Harry Potter and the Chamber of Secrets', 'J. K. Rowling', 1.55, 'The next book in the Harry Potter series.', 'English', 'Hardcover', 380, 'Hardcover', 102, now() - interval '6 days');

insert into public."BookImages" ("idBook", "imageURL", "isPrimary") values
(1, 'https://covers.openlibrary.org/b/isbn/0671027034-L.jpg', true),
(2, 'https://covers.openlibrary.org/b/isbn/0061122416-L.jpg', true),
(3, 'https://covers.openlibrary.org/b/isbn/059035342X-L.jpg', true),
(4, 'https://covers.openlibrary.org/b/isbn/0062316095-L.jpg', true),
(5, 'https://covers.openlibrary.org/b/isbn/1612680194-L.jpg', true),
(6, 'https://covers.openlibrary.org/b/isbn/0439064872-L.jpg', true);

insert into public."BookAuthor" ("idBook", "idAuthor") values
(1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 3);

insert into public."BookCategory" ("idBook", "idCategory") values
(1, 1), (2, 2), (3, 5), (3, 2), (4, 4), (5, 3), (6, 5), (6, 2);

insert into public."BookPublisher" ("idBook", "idPublisher") values
(1, 1), (2, 1), (3, 3), (4, 2), (5, 2), (6, 3);

insert into public."Address" ("idCustomer", "receiverName", "addressString") values
(1, 'Demo User', 'Quan 1, TP HCM');

insert into public."Payment" ("idCustomer", "paymentMethod", "status") values
(1, 'Cash on Delivery (COD)', 'Active'),
(1, 'Chuyen khoan ngan hang', 'Active');

insert into public."Shipment" ("shipmentMethod", "estimatedDate", "status") values
('Standard delivery', '3-5 days', 'Active'),
('Express delivery', '1-2 days', 'Active');

insert into public."Voucher" ("code", "description", "type", "discountValue", "minOrderValue", "expiryDate", "usageLimit") values
('BOOK10', '10 percent discount', 'PERCENT', 10, 1, now() + interval '90 days', 100),
('FREESHIP', 'Shipping fee discount', 'FIXED', 0.2, 1, now() + interval '90 days', 100);

insert into public."Review" ("idBook", "idCustomer", "rating", "comment", "createdAt") values
(1, 1, 5, 'Sach hay va de ap dung.', now() - interval '3 days'),
(2, 1, 4, 'Noi dung truyen cam hung.', now() - interval '2 days'),
(3, 1, 5, 'Rat phu hop de doc giai tri.', now() - interval '1 day');

select 'Categories' as table_name, count(*) as row_count from public."Categories"
union all select 'Book', count(*) from public."Book"
union all select 'BookImages', count(*) from public."BookImages"
union all select 'Customer', count(*) from public."Customer";

