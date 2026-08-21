const url = "https://nqrxsdtbfebhaztbezfa.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcnhzZHRiZmViaGF6dGJlemZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MjA3NDQsImV4cCI6MjEwMjI5Njc0NH0.yabIih53OEaLN1MVLby_K22oS5vMnIpRmpkv4NYpvX8";

fetch(url)
.then(res => res.json())
.then(data => {
  console.log(JSON.stringify(data).substring(0, 500));
  if (data.definitions && data.definitions.organizations) {
    console.log(Object.keys(data.definitions.organizations.properties));
  }
})
.catch(console.error);
