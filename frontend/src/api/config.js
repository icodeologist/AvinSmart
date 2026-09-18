export const API_BASE_URL = "http://localhost:8080/api/v1";

export function unwrap(data) {
  return data && data.success && Object.prototype.hasOwnProperty.call(data, "data")
    ? data.data
    : data;
}