import {commandSchema} from "@/lib/domain";
import {authenticate,apiFailure,ApiError} from "@/lib/server";
export async function POST(request:Request){try{
 if(Number(request.headers.get("content-length"))>32768)throw new ApiError("Solicitud demasiado grande.",413);
 const {db}=await authenticate(request);const raw=await request.text();if(raw.length>32768)throw new ApiError("Solicitud demasiado grande.",413);
 let input:unknown;try{input=JSON.parse(raw);}catch{throw new ApiError("JSON inválido.");}
 const parsed=commandSchema.safeParse(input);if(!parsed.success)throw new ApiError(parsed.error.issues[0]?.message||"Datos inválidos.");
 const {data,error}=await db.rpc("execute_command",{p_command:parsed.data});
 if(error){if(error.code==="23505")throw new ApiError("El código ya existe o la operación ya fue registrada.",409);if(error.code==="P0001"||error.code==="23514"||error.code==="22P02")throw new ApiError(error.code==="P0001"?error.message:"Datos fuera de los límites permitidos.",400);throw new ApiError("No se pudo guardar. Revisa tu conexión y configuración.",503);}
 return Response.json({ok:true,id:data},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return apiFailure(e);}}
