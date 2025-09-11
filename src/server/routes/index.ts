"use strict";
import activity from "./activity";
import configJsonFile from '../../public/config.json';

/*
 * GET home page.
 */
const index = (req: any, res: any) => {
	if (!req.session.token) {
		res.render("index", {
			title: "Unauthenticated",
			errorMessage: "This app may only be loaded via Salesforce Marketing Cloud."
		});
	} else {
		res.render("index", {
			title: "Journey Builder Activity",
			results: activity.logExecuteData
		});
	}
};

const login = (req: any, res: any) => {
	res.redirect("/");
};

const logout = (req: any, res: any) => {
	req.session.token = "";
};

const configJson = async (req: any, res: any) => {
	const {
		SALESFORCE_APPLICATION_EXTENSION_KEY,
		THIS_SERVER_BASE_URL,
	} = process.env;
	configJsonFile.configurationArguments.applicationExtensionKey = SALESFORCE_APPLICATION_EXTENSION_KEY || 'NOT_PROVIDED';
	configJsonFile.arguments.execute.url = `${THIS_SERVER_BASE_URL}/journeybuilder/execute`;
	configJsonFile.configurationArguments.save.url = `${THIS_SERVER_BASE_URL}/journeybuilder/save`;
	configJsonFile.configurationArguments.publish.url = `${THIS_SERVER_BASE_URL}/journeybuilder/publish`;
	configJsonFile.configurationArguments.stop.url = `${THIS_SERVER_BASE_URL}/journeybuilder/stop`;
	configJsonFile.configurationArguments.validate.url = `${THIS_SERVER_BASE_URL}/journeybuilder/validate`;
	res.json(configJsonFile);
};

export default {
	index,
	login,
	logout,
	configJson,
};
