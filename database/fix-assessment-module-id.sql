-- Fix: Buat module_id nullable di tabel assessments dan materials
-- Karena fitur modul ajar sudah dihapus

ALTER TABLE assessments ALTER COLUMN module_id DROP NOT NULL;
ALTER TABLE materials ALTER COLUMN module_id DROP NOT NULL;
