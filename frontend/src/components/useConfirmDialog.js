import { createElement, useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

const defaultOptions = {
  title: "Please Confirm",
  message: "Are you sure you want to continue?",
  confirmText: "Confirm",
  cancelText: "Cancel",
  tone: "danger",
};

export function useConfirmDialog() {
  const [options, setOptions] = useState(defaultOptions);
  const [open, setOpen] = useState(false);
  const [resolver, setResolver] = useState(null);

  const closeDialog = (value) => {
    setOpen(false);
    if (resolver) {
      resolver(value);
      setResolver(null);
    }
  };

  const confirm = (newOptions = {}) =>
    new Promise((resolve) => {
      setResolver(() => resolve);
      setOptions({ ...defaultOptions, ...newOptions });
      setOpen(true);
    });

  useEffect(() => {
    return () => {
      if (resolver) {
        resolver(false);
      }
    };
  }, [resolver]);

  const confirmDialog = createElement(ConfirmDialog, {
    open,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText,
    cancelText: options.cancelText,
    tone: options.tone,
    onCancel: () => closeDialog(false),
    onConfirm: () => closeDialog(true),
  });

  return { confirm, confirmDialog };
}
