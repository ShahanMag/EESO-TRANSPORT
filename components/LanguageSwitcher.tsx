"use client";

import i18n from "@/utils/i18n";
import { useEffect, useState } from "react";

export default function LanguageSwitcher() {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("lang") || "en";
    setLang(saved);

    i18n.changeLanguage(saved);
    document.documentElement.lang = saved;
    document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
  }, []);

  const changeLanguage = (language: "en" | "ar") => {
    setLang(language);

    i18n.changeLanguage(language);

    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

    localStorage.setItem("lang", language);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex rounded-full bg-white shadow-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => changeLanguage("en")}
        className={`px-5 py-2 text-sm font-semibold transition-all duration-300 ${
          lang === "en"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        🇬🇧 English
      </button>

      <button
        onClick={() => changeLanguage("ar")}
        className={`px-5 py-2 text-sm font-semibold transition-all duration-300 ${
          lang === "ar"
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-700 hover:bg-gray-100"
        }`}
      >
        🇸🇦 العربية
      </button>
    </div>
  );
}
