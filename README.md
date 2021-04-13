# Briefcase
To be utilized in Veeva CLM presentations. 

## Dependencies
- [Veeva-library.js] (https://cdnmc1.vod309.com/clm/release/veeva-library.js)

## CRM Permissions Requirements
## Functionality
There are two scripts that are pulled in this package. The ``briefcase-engine.js`` is **required** while the ``briefcase-widget.js`` is **optional**.

 The ``briefcase-engine.js`` is the code that grabs the local data for presentations and associated key messages. This script should be loaded into your project **before** the briefcase-widget. 

 The ``briefcase-widget.js`` is the front end code that utilizes the data returned by the briefcase-engine script. This script should be loaded into your project **after** the briefcase-engine. The included briefcase-widget file has three main uses:

 1. Dynamic Briefcase (briefcase generated dynamically, utilizing the Clm_Presentation_vod__c.Presentation_Id_vod prefix - more about this in [implementation] (#dynamic-briefcase-implementation)).
 2. Static Briefcase (briefcase with a defined presentation in the HTML - more about this in [implementation] (#static-briefcase-implementation))
 3. Hotspots (allows you to generate hotlinks to different presentations with only the Clm_Presentation_vod__c.Presentation_Id_vod and Clm_Presentation_Slide_vod__c.Name values, see more in [#Hotspot-implementation] (#implementation))

### Briefcase Engine Functionality
The ``briefcase-engine.js`` script acts as an API which, when called, returns all data related to locally available presentations, as well as the data of all associated slides. 

The call will take the current presentations product (Clm_Presentation_vod__c.Product_vod) and status (Clm_Presentation_vod__c.Status_vod), therefore it **will only ever give you presentations of the same status and product**.

#### Briefcase Engine Implementation
To implement the briefcase engine, you will need to call ``briefcase.init()``. This will not return anything, however you will then have access to the **briefcase.data** array. This array should consist of all presentations available with matching **status** and **products**. 

Example briefcase.init function:
```
document.addEventListener('DOMContentLoaded', async (e) => {
    await briefcase.init();
})
```

(If you want to find out what exacly ``briefcase.data`` is, you should be able to enter it into your console to view all presentations (and associated key messages)).

Here is an example of the ``briefcase.data`` array:

```
[
    {
        presentationName: "nameOfPresentation",
        presentationId: "idOfPresentation",
        status: "statusOfPresentation",
        keyMessages:[
            {
                keyMessageName: "nameOfKeyMessage",
                keyMessageStatus: "statusOfKeyMessage",
                keyMessageVersion: "versionOfKeyMessage",
                displayOrder: ~Number~,
                mediaFileName: "distributionPackageName.zip"
            },
            {
                ...
            }
        ]
    }, {
        ...
    }
]
```

Important Notes:

- Since the script fires on load, as you add more calls to the Veeva API you will need to ensure the calls are **asynchronous**. Due to Veeva API limits (1 call at a time), you will need to ensure all calls are async, otherwise one of your scripts may fail.

-  The briefcase is designed to set the data in local storage under the key `presentationData`. This optimizes the flow of the briefcase calls so that it only runs on the first load of the first slide. If you are developing for windows and do not have access to local storage, it will re-run the briefcase-engine and set `briefcase.data` to the data from the briefcase-engine call. 

### Briefcase Widget
The ``briefcase-widget.js`` is not a required script, but compliments the ``briefcase-engine.js`` file. It calls on the available data (``briefcase.data``) and utilizes it in the front end. The standard use cases are: 
- Dynamic Briefcase
- Static Briefcase
- Hotspots

**There will be more on this under [Briefcase Wdiget Implementation](#briefcase-widget-implementation)**

If you want to create custom functionality, developers can create their own front end widget or functionality by implementing the ``briefcase-engine.js``. This script gives globally available presentation data required for the functionality to work. All available data will be available in ``briefcase.data``.

#### Briefcase Widget Implementation
In order to implement the ``briefcase-widget.js`` script, you will need to call ``briefcase_widget.init()`` after the briefcase script runs. Here is an example of the briefcase widget implementation:

Example of briefcase_widget.init() implementation:
```
window.addEventListener('DOMContentLoaded', async (e) => {
    /* Initialize the script to get the data, store it in briefcase.data */
    await briefcase.init();

    /* Initiate the widget. Pulls data from briefcase.data variable and utilizes it on the front end based off of data attributes */
    await briefcase_widget.init();
})
```

Note: since the briefcase_widget is dependent on the ``briefcase.data`` be sure to take that into account when calling the scripts. 

##### Static Briefcase 
The static briefcase returns a presentation object. It is used in cases where you have one presentation with some slides you require hotspots to. It will be set on the element you want your briefcase appended to within your HTML. This element, should have the attribute ``data-briefcase-static`` and it should be equal to the Presentation Id you require access to. 

For example, if you need access to a presentation  with a Presentation Id :``briefcase_pdfs``, you would have the following markup: 
```
<div data-briefcase-static="briefcase_pdfs">
</div>
```
If it can find a presentation id within the data returned from he briefcase-engine, it should return markup within the element that looks like this: 
```
<div data-briefcase-static="briefcase_pdfs">
    <ul class="briefcase-list">
        <li class="list-item" data-slide="distributionMediaFileName.zip" data-presentation="presentationId">{SlideName}</li>
        ...
    </ul>
</div>
```
If there are any issues with your call or if no available presentations with that presentation Id, the function will stop. 

**Thing to consider:**
- If you have a list of PDFs in a binder, you can disable `Swipe_vod` and `Navigation_vod` on Key_Message_vod level. This ensures the user cannot swipe between PDF slides. 

##### Dynamic Briefcase
The dynamic briefcase code does something very similar to the static briefcase, however it allows you to create a briefcase by passing in a query (it should be a string). There are two required steps to implementation:
1. **Veeva Vault** - In the associated vault, any presentations you require within your briefcase, add a prefix to the Presentation Id. Example: ```briefcase_asset:presentationId```
    - If you require a specific order, you can add a number to the end of the prefix. This will allow you to set the index. Example: `briefcase_asset_1:presentationId`. If you have some with number and not others the ones without numbers will be set after the numbered items. 

2. **Code** - Within your HTML, add a ```data-briefcase-dynamic``` attribute. This should equal the prefix value mentioned previously. If no value is found a warning will show in the console and no briefcase will be created. 

It is important to note that the dynamic briefcase will always add hotspots to the **first** slide in a presentation 

@TODO Specific briefcase id format (maybe validation?) 

Example markup: 
```
<div data-briefcase-dynamic="briefcase_asset">
     <ul class="briefcase-list">
        <li class="list-item" data-slide="distributionMediaFileName.zip" data-presentation="briefcase_asset_1:presentationId">{SlideName}</li>
        ...
    </ul>
</div>
```

**Things to consider:**
- Take care in naming your prefix value, this should be mutually agreed upon with the client.
##### Hotspots
Hotspots 
