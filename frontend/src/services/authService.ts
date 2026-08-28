import { apiClient } from "./apiClient";
import {
  SignupPayload,
  SignupResponse,
  LoginPayload,
  LoginResponse,
  MeResponse,
  HealthCheckResponse,
} from "../types/auth";

export async function checkHealth(): Promise<HealthCheckResponse> {
  return apiClient<HealthCheckResponse>("/");
}

export async function signup(payload: SignupPayload): Promise<SignupResponse> {
  return apiClient<SignupResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiClient<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<MeResponse> {
  return apiClient<MeResponse>("/api/auth/me");
}
