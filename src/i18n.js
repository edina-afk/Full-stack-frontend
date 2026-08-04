import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./languages/en";
import am from "./languages/am";

i18n
.use(initReactI18next)
.init({
  resources: {
    en: {
      translation: en
    },
    am: {
      translation: am
    }
  },
  lng: "en",
  fallbackLng: "en"
});

export default i18n;