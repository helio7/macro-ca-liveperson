define(['postmonger'], (Postmonger) => {
    'use strict';

    let $ = jQuery.noConflict(); // Evitar conflicto con otras versiones de jQuery
    let connection = new Postmonger.Session();

    let activity = {};

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

        const inArguments = Boolean(
            data.arguments &&
            data.arguments.execute &&
            data.arguments.execute.inArguments &&
            data.arguments.execute.inArguments.length > 0
        ) ? data.arguments.execute.inArguments : [];

        console.log('inArguments when initActivity:', inArguments);

        const dataExtensionArg = inArguments.find(arg => arg.dataExtension);
        if (dataExtensionArg) document.getElementById('dataExtension').value = dataExtensionArg.dataExtension;

        const dataExtensionPhoneNumberColumnNameArg = inArguments.find(arg => arg.dataExtensionPhoneNumberColumnName);
        if (dataExtensionPhoneNumberColumnNameArg) document.getElementById('dataExtensionPhoneNumberColumnName').value = dataExtensionPhoneNumberColumnNameArg.dataExtensionPhoneNumberColumnName;

        const campaignNameArg = inArguments.find(arg => arg.campaignName);
        if (campaignNameArg) document.getElementById('campaignName').value = campaignNameArg.campaignName;

        const templateIdArg = inArguments.find(arg => arg.templateId);
        if (templateIdArg) document.getElementById('templateId').value = templateIdArg.templateId;

        const variablesArg = inArguments.find(arg => arg.variables);
        if (variablesArg) {
            if (variablesArg.variables !== 'NO_VARIABLES') {
                const parsedVariables = deserializeString(variablesArg.variables);
                let numberOfItems = 0;
                for (const parsedVariable in parsedVariables) {
                    numberOfItems++;
                    const itemNumber = String(numberOfItems);

                    const groupDiv = document.createElement('div');
                    groupDiv.className = 'variable-item';
                    groupDiv.id = 'group-' + itemNumber;

                    const span = document.createElement('span');
                    span.innerText = 'Variable ' + itemNumber + ':';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.name = 'dataExtensionColumnName';
                    input.placeholder = 'Nombre de columna en D.E.';
                    input.value = parsedVariables[parsedVariable].split('.').pop()?.replace('}}', '');
                    input.className = 'text-input';
                    input.setAttribute('required', '');

                    groupDiv.appendChild(span);
                    groupDiv.appendChild(input);

                    const variablesFieldset = document.getElementById('variables-fieldset');

                    variablesFieldset.appendChild(groupDiv);

                    if (numberOfItems === 1) {
                        document.getElementById('button-that-removes-items').hidden = false;
                    }
                }
            }
        }
    });

    connection.on('clickedNext', () => { // Save function within MC.
        const dataExtension = document.getElementById('dataExtension').value;
        const dataExtensionPhoneNumberColumnName = document.getElementById('dataExtensionPhoneNumberColumnName').value;
        const campaignName = document.getElementById('campaignName').value;
        const templateId = document.getElementById('templateId').value;
        const phoneNumber = `{{Contact.Attribute."${dataExtension}".${dataExtensionPhoneNumberColumnName}}}`;

        const groupDivs = document.querySelectorAll('.variable-item');
        const variablesObject = {};
        for (const groupDiv of groupDivs) {
            const input = groupDiv.querySelector('input');
            const variableNumber = groupDiv.id.split('group-')[1];
            const dataExtensionColumnName = input.value;
            variablesObject[variableNumber] = `{{Contact.Attribute."${dataExtension}".${dataExtensionColumnName}}}`;
        }
        const variables = groupDivs.length ? serializeObject(variablesObject) : 'NO_VARIABLES';

        activity['arguments'].execute.inArguments = [
            { dataExtension: dataExtension ? dataExtension : null },
            { dataExtensionPhoneNumberColumnName: dataExtensionPhoneNumberColumnName ? dataExtensionPhoneNumberColumnName : null },
            { campaignName: campaignName ? campaignName : null },
            { templateId: templateId ? templateId : null },
            { phoneNumber: phoneNumber ? phoneNumber : null },
            { variables: variables ? variables : null },
        ];

        activity['metaData'].isConfigured = true;

        console.log('activity before triggering updateActivity:', activity);

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

    connection.on('requestedTriggerEventDefinition', (eventDefinitionModel) => {
        if (eventDefinitionModel) eventDefinitionKey = eventDefinitionModel.eventDefinitionKey;
    });
});

function serializeObject(obj) {
    return Object.entries(obj)
        .map(([key, value]) => `${key}=${value}`)
        .join(';');
}

function deserializeString(str) {
    const result = {};
    str.split(';').forEach(pair => {
      const [key, ...rest] = pair.split('=');
      result[key] = rest.join('='); // Handles '=' inside the value
    });
    return result;
}
