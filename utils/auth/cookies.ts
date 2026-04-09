import { User } from "firebase/auth";

export function saveAuthTokenToCookie(user: User) {
  user.getIdToken().then((idToken) => {
    const secure = process.env.NODE_ENV === "production";
    document.cookie = `idToken=${idToken}; max-age=3600; path=/; secure=${secure}; samesite=lax; SameSite=Lax`;
  });
}

export function removeAuthTokenFromCookie() {
  document.cookie = "idToken=; max-age=0; path=/";
}

export function refreshAuthToken(user: User) {
  user.getIdToken(true).then((idToken) => {
    const secure = process.env.NODE_ENV === "production";
    document.cookie = `idToken=${idToken}; max-age=3600; path=/; secure=${secure}; samesite=lax; SameSite=Lax`;
  });
}
