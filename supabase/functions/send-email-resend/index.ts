const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const handler = async (req: Request): Promise<Response> => {
  console.log("start:",req.method);
  if (req.method === "OPTIONS") {
    // Respond to the preflight request with CORS headers:
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // Replace with your actual origin in production!
      "Access-Control-Allow-Methods": "POST", // Add other methods if needed
      "Access-Control-Allow-Headers": "Content-Type, Apikey, Authorization, Referer, Sec-ch-ua, Sec-ch-ua-mobile, Sec-ch-ua-platform, User-agent, X-client-info", // Add other headers if needed
    };
    return new Response(null, {
      status: 204, // No Content
      headers: corsHeaders,
    });
  }
  const { userName, email, schoolName, notes, role } = await req.json();  // Use req.text() to read the body
  
  const body = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email Subject</title>
    </head>
    <body>
      <p>Role: ${role}</p>
      <p>User Name: ${userName}</p>
      <p>Email: ${email}</p>
      <p>School Name: ${schoolName}</p>
      <p>Notes:</p>
      <p>${notes}</p>
    </body>
    </html>
  `;


  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'dont-drop-the-100@resend.dev',
      to: 'sefi.maman@gmail.com',
      subject: 'Dont Drop the 100 - request:',
      html: body,
    }),
  })
  console.log(res);
  const data = await res.json()
  console.log(data);
  const successResponse = new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  console.log(successResponse);
  // Add CORS headers to the success response
  successResponse.headers.set("Access-Control-Allow-Origin", "*"); // Or specify your origin
  successResponse.headers.set("Access-Control-Allow-Methods", "POST"); // Add other methods if needed (GET, PUT, DELETE, etc.)
  successResponse.headers.set("Access-Control-Allow-Headers", "Content-Type"); // Add other headers if needed (Authorization, etc.)
   
  return successResponse
}

Deno.serve(handler)