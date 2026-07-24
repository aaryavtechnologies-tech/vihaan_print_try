import "dotenv/config";
import { auth } from "../src/lib/auth";

async function seedAdmin() {
  try {
    const res = await auth.api.signUpEmail({
      body: {
        email: "admin@gmail.com",
        password: "admin123",
        name: "Admin User",
      },
    });
    console.log("Admin user created successfully:", res);
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}

seedAdmin();
