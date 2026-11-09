import type { Metadata } from "next";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "AgroControl | Finca Cafetalera",
    template: "%s | AgroControl",
  },
  description:
    "Control de inventario, insumos y ventas para una finca cafetalera. Recepción de productos, gestión de clientes y proveedores, y seguimiento de existencias.",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Provider>
          <Shell>{children}</Shell>
        </Provider>
      </body>
    </html>
  );
}
