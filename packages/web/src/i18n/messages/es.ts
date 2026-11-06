import common from "./es/common";
import nav from "./es/nav";
import topbar from "./es/topbar";
import dashboard from "./es/dashboard";
import data from "./es/data";
import configuration from "./es/configuration";
import chat from "./es/chat";
import devices from "./es/devices";
import users from "./es/users";
import alerts from "./es/alerts";
import skills from "./es/skills";
import jobs from "./es/jobs";
import logs from "./es/logs";
import manual from "./es/manual";
import topology from "./es/topology";
import workspace from "./es/workspace";
import terminal from "./es/terminal";
import auth from "./es/auth";
import forms from "./es/forms";
import errors from "./es/errors";
import toasts from "./es/toasts";

const es = {
  common,
  nav,
  topbar,
  dashboard,
  data,
  configuration,
  chat,
  devices,
  users,
  alerts,
  skills,
  jobs,
  logs,
  manual,
  topology,
  workspace,
  terminal,
  auth,
  forms,
  errors,
  toasts,
};

export type Dictionary = typeof es;

export default es;
