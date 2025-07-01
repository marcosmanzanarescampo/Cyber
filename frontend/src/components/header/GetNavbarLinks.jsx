export async function getNavbarLinks() {
  let formations = [];
  const url = import.meta.env.VITE_BACKEND_URL;
  try {
    const res = await fetch(`${url}/course/courses`);
    const data = await res.json();
    formations = Array.isArray(data.courses) ? data.courses : [];
  } catch (e) {
    formations = [];
  }

  return [
    { value: "Accueil", hasDropdown: false, path: "/" },
    { value: "Dashboard", hasDropdown: false, path: "/dashboard" },
    {
      value: "Outils Gratuits",
      hasDropdown: true,
      list: [
        { label: "Canva", path: "/canva" },
        { label: "Notion", path: "/notion" },
        { label: "ChatGPT", path: "/chatgpt" },
      ],
    },
    {
      value: "Formations",
      hasDropdown: true,
      path: "/Formation",
      list: formations.map((course) => ({
        label: course.title,
        path: `/Formation?id=${course._id}`,
      })),
    },
  ];
}
