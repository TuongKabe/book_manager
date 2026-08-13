"use client";

import type { ReactNode } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";

export default function EditModal({
  title,
  description,
  onClose,
  onSave,
  saving = false,
  children,
  size = "md",
  cancelLabel = "Hủy",
  saveLabel = "Lưu",
}: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  onSave: () => void;
  saving?: boolean;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  cancelLabel?: ReactNode;
  saveLabel?: ReactNode;
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onSave} loading={saving}>
            {saveLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}
