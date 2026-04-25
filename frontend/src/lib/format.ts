export const toRupees = (paise: number) =>
  `₹${(Number(paise) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type DateInput = string | number | Date;

export const formatDate = (date: DateInput) =>
  new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const formatTime = (date: DateInput) =>
  new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const shortId = (id?: string | null) =>
  id ? `${id.slice(0, 8)}…${id.slice(-4)}` : "";
