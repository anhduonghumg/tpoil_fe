import logo from "../assets/logo_200.png";
export default function SplashScreen() {
  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#fff",
        gap: 16,
      }}
    >
      <img src={logo} alt="Logo" width={96} height={96} />
      <div className="ant-spin ant-spin-spinning">
        <span className="ant-spin-dot ant-spin-dot-spin">
          <i className="ant-spin-dot-item" />
          <i className="ant-spin-dot-item" />
          <i className="ant-spin-dot-item" />
          <i className="ant-spin-dot-item" />
        </span>
      </div>
    </div>
  );
}
