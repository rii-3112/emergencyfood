import { DATE_FORMATS, EXPIRY_WARNING_DAYS } from "./constants";

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString(DATE_FORMATS.DISPLAY);
};

export const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isNearExpiry = (expiryDate: string): boolean => {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil > 0 && daysUntil <= EXPIRY_WARNING_DAYS.NEAR_EXPIRY;
};

export const isCriticallyNearExpiry = (expiryDate: string): boolean => {
  const daysUntil = getDaysUntilExpiry(expiryDate);
  return daysUntil > 0 && daysUntil <= EXPIRY_WARNING_DAYS.CRITICAL_EXPIRY;
};

export const isExpired = (expiryDate: string): boolean => {
  return getDaysUntilExpiry(expiryDate) < 0;
};

export const formatFirestoreTimestamp = (timestamp: {
  seconds: number;
  nanoseconds: number;
}): string => {
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString(DATE_FORMATS.DISPLAY);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isValidTeamName = (teamName: string): boolean => {
  return teamName.length >= 2 && teamName.length <= 50;
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
};

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const sortSupplysByExpiry = <T extends { expiryDate: string }>(
  supplies: T[]
): T[] => {
  return [...supplies].sort((a, b) => {
    const dateA = new Date(a.expiryDate);
    const dateB = new Date(b.expiryDate);
    return dateA.getTime() - dateB.getTime();
  });
};

export const filterSupplysByCategory = <T extends { category: string }>(
  supplies: T[],
  category: string
): T[] => {
  return supplies.filter((supply) => supply.category === category);
};

export const getFirebaseErrorMessage = (error: any): string => {
  if (typeof error === "string") return error;

  const errorCode = error?.code || error?.message;

  switch (errorCode) {
    case "auth/user-not-found":
      return "ユーザーが見つかりません。";
    case "auth/wrong-password":
      return "パスワードが間違っています。";
    case "auth/email-already-in-use":
      return "このメールアドレスは既に使用されています。";
    case "auth/weak-password":
      return "パスワードが弱すぎます。";
    case "auth/invalid-email":
      return "無効なメールアドレスです。";
    case "auth/too-many-requests":
      return "リクエストが多すぎます。しばらく待ってから再試行してください。";
    default:
      return "エラーが発生しました。しばらく待ってから再試行してください。";
  }
};

export const saveToLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {}
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    return null;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {}
};
