// src/config.js

export const BACKEND_URL = "http://localhost:5000";
// routes
export const ROUTE_SIGNIN = `${BACKEND_URL}/user/signin`;
export const ROUTE_REGISTER = `${BACKEND_URL}/user/register`;
export const ROUTE_USER_FORGOT_PASSWORD = `${BACKEND_URL}/user/forgot-password`;
export const ROUTE_USER_RESET_PASSWORD = `${BACKEND_URL}/user/reset-password`;
export const ROUTE_USER_LOGOUT = `${BACKEND_URL}/user/logout`;
export const ROUTE_TOKEN_REFRESH = `${BACKEND_URL}/auth/refresh`;
export const ROUTE_USER_INFO = `${BACKEND_URL}/user/me`;
export const ROUTE_SAVE_USER_INFO = `${BACKEND_URL}/user/saveInfo`;
export const ROUTE_CREATE_COURSE = `${BACKEND_URL}/course/create`;
export const ROUTE_COURSE_FETCH = `${BACKEND_URL}/course/courses`;
export const ROUTE_COURSE_DELETE = `${BACKEND_URL}/course/delete`;
export const ROUTE_USER_DELETE = `${BACKEND_URL}/user/delete`;
export const ROUTE_USERS_FETCH = `${BACKEND_URL}/user/users`;
export const ROUTE_USER_COURSES_FETCH = `${BACKEND_URL}/userCourse/courses`;
export const ROUTE_TOGGLE_USER_COURSE = `${BACKEND_URL}/userCourse/toggle`;
