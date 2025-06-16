// frontend/src/outils/TryRefresh

<<<<<<< HEAD
=======
// import { ROUTE_TOKEN_REFRESH } from "../config.js";

// export async function tryRefresh() {
//   try {
//     const res = await fetch(ROUTE_TOKEN_REFRESH, {
//       method: "POST",
//       credentials: "include",
//     });

//     if (res.status === 204) {
//       // Aucun token fourni → rien à rafraîchir
//       return null;
//     }

//     if (!res.ok) {
//       return null;
//     }

//     const result = await res.json();
//     return result?.user || null;
//   } catch (error) {
//     console.error("Erreur réseau lors du refresh :", error);
//     return null;
//   }
// }

>>>>>>> d9028ea (12 upload projet)
import { ROUTE_TOKEN_REFRESH } from "../config.js";

export async function tryRefresh() {
  try {
    const res = await fetch(ROUTE_TOKEN_REFRESH, {
      method: "POST",
      credentials: "include",
    });

    // Si la réponse est vide, inutile de parser en JSON
    const contentLength = res.headers.get("content-length");
    if (!res.ok || !contentLength || contentLength === "0") {
      return null;
    }

    const result = await res.json();
    return result?.user || null;
  } catch (error) {
    console.error("Erreur réseau lors du refresh :", error);
    return null;
  }
}
