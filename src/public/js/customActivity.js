let connection;

define(['postmonger'], (Postmonger) => {
    'use strict';

    connection = new Postmonger.Session();
    let activity;

    // Configuration variables
    let eventDefinitionKey;

    $(window).ready(() => {
        // JB will respond the first time 'ready' is called with 'initActivity'
        connection.trigger('ready');
        connection.trigger('requestTokens');
        connection.trigger('requestEndpoints');
        connection.trigger("requestTriggerEventDefinition");
        connection.trigger("requestInteraction");
    });

    connection.on('initActivity', (data) => {
        if (data) activity = data;
    });

    connection.on('requestedInteraction', (payload) => {});

    connection.on('clickedNext', () => { // Save function within MC.
        const phoneNumber = `{{Contact.Attribute."NOMBRE_DE_DATA_EXTENSION".NUMERO_DE_TELEFONO}}`;
        activity['arguments'].execute.inArguments = [
            { phoneNumber: phoneNumber ? phoneNumber : null },
        ];
        activity['metaData'].isConfigured = true;
        connection.trigger('updateActivity', activity);
    });

    /**
     * This function is to pull out the event definition within journey builder.
     * With the eventDefinitionKey, you are able to pull out values that passes through the journey
     */
    connection.on('requestedTriggerEventDefinition', (eventDefinitionModel) => {
        console.log("Requested TriggerEventDefinition", eventDefinitionModel.eventDefinitionKey);
        if (eventDefinitionModel) eventDefinitionKey = eventDefinitionModel.eventDefinitionKey;
    });
});
