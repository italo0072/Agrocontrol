import {authenticate,apiFailure,ApiError} from "@/lib/server";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const {db,profile}=await authenticate(request);
 const [p,c,m,s,metrics]=await Promise.all([db.from("products").select("*").order("name").limit(1000),db.from("partners").select("*").order("name").limit(1000),db.from("movements").select("*").order("created_at",{ascending:false}).limit(201),db.from("sales").select("*").order("created_at",{ascending:false}).limit(201),db.rpc("dashboard_metrics")]);
 if([p,c,m,s,metrics].some(r=>r.error))throw new ApiError("No se pudieron leer los datos. Revisa que ejecutaste la migración SQL y tengas acceso.",503);
 if((p.data?.length??0)>=1000||(c.data?.length??0)>=1000)throw new ApiError("El catálogo alcanzó 1,000 registros. Amplía la paginación antes de continuar.",409);
 return Response.json({products:p.data,partners:c.data,movements:m.data?.slice(0,200),sales:s.data?.slice(0,200),metrics:metrics.data,role:profile.role,email:profile.email,history_limited:(m.data?.length??0)>200||(s.data?.length??0)>200},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return apiFailure(e);}}
