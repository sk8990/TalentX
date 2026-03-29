import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  tone,
  onCancel,
  onConfirm,
}) {
  const confirmButtonSx =
    tone === "danger"
      ? {
          bgcolor: "#e11d48",
          "&:hover": { bgcolor: "#be123c" },
        }
      : {
          bgcolor: "#4f46e5",
          "&:hover": { bgcolor: "#4338ca" },
        };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid #e2e8f0",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: "1rem",
          fontWeight: 700,
          color: "#0f172a",
        }}
      >
        <WarningAmberRoundedIcon sx={{ color: tone === "danger" ? "#e11d48" : "#4f46e5" }} />
        {title}
      </DialogTitle>
      <DialogContent sx={{ pt: 0.5 }}>
        <DialogContentText sx={{ color: "#475569", fontSize: "0.9rem" }}>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button
          onClick={onCancel}
          variant="outlined"
          sx={{ borderRadius: 2, borderColor: "#cbd5e1", color: "#334155", textTransform: "none" }}
        >
          {cancelText}
        </Button>
        <Button onClick={onConfirm} variant="contained" sx={{ borderRadius: 2, textTransform: "none", ...confirmButtonSx }}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
