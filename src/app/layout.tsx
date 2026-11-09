import type {Metadata} from "next";
import {Provider} from "@/components/provider";
import {Shell} from "@/components/shell";
import "./globals.css";
export const metadata:Metadata={title:{default:"AgroControl | Inventario y ventas",template:"%s | AgroControl"},description:"Gestión estandarizada de productos, inventario y ventas para una distribuidora de fertilizantes.",robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="es"><body><Provider><Shell>{children}</Shell></Provider></body></html>;}
