import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { ConfigProvider, theme } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./App.css";
import AppInit from "./app/AppInit";

const themeTokens = {
  token: {
    colorPrimary: "#1677ff",
    borderRadius: 10,
  },
  algorithm: theme.defaultAlgorithm,
  components: {
    Notification: {
      padding: 16,
      borderRadiusLG: 12,
    },
    Message: {
      contentBg: "#ffffff",
      colorText: "#1f2937",
    },
  },
};

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={themeTokens}>
        <AppInit />
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
