const briefcase = {
  currentPresentationData: undefined,
  data: null,
  // ****VEEVA API HELPER FUNCTIONS*** //
  queryRecordHelper: (objectName, fields, whereClause, sortClause, limit) => {
    return new Promise((resolve, reject) => {
      com.veeva.clm.queryRecord(objectName, fields, whereClause, sortClause, limit, result => {
        if (result.success == true) {
          resolve(result);
        } else {
          reject(new Error(`Issue with API call to object ${objectName}, for ${fields}`));
        }
      });
    });
  },
  queryCurrentObjectHelper: (objectName, fields) => {
    return new Promise((resolve, reject) => {
      com.veeva.clm.getDataForCurrentObject(objectName, fields, result => {
        if (result.success == true) {
          resolve(result);
        } else {
          reject(new Error(`Issue with API call to object ${objectName}, for ${fields}`));
        }
      });
    });
  },
  // ***** END OF HELPER FUNCTIONS ****** //
  getCurrentPresentationData: async () => {
    //  Gets status of current presentation status and product. Allows you to use it in all API call WHERE cases later on
    const currentPresentationData = {
      "status": "",
      "product": ""
    }; // Gets presentation product, to ensure assets are all the same. Allows you to use it in all API call WHERE cases later on

    const productData = await briefcase.queryCurrentObjectHelper("Presentation", "Product_vod__c"); // if API call was a success, save the data in the above object

    if (productData.success == true) {
      currentPresentationData.product = productData.Presentation.Product_vod__c;
    } else {
      console.log(new Error("Failed to get presentation product", productData));
    } // Check to see status of current presentation


    const statusData = await briefcase.queryCurrentObjectHelper("Presentation", "Status_vod__c"); // if API call was a success, save the data in the above object

    if (statusData.success == true) {
      currentPresentationData.status = statusData.Presentation.Status_vod__c;
    } else {
      console.log(new Error("Failed to get presentation status", statusData));
    } // save the data in a global variable (on the briefcase object) so that it is available in all functions after

    return currentPresentationData;
  },
  getAllPresentationData: async currentPresentationData => {
    // Requires the current presentation data to be correct. Should include presentation Product ID as well as the status. 
    // Call to get all presentations, based on status and product of current presentation
    const objectName = "Clm_Presentation_vod__c";
    const fields = ["Name", "Presentation_Id_vod__c", 'Id', 'Status_vod__c'];
    const whereClause = `WHERE Product_vod__c = '${currentPresentationData.product}' AND Status_vod__c = '${currentPresentationData.status}'`;
    const sortClause = [];
    const limit = ""; // Call to get all presentation Data, for everything available based on current presentation statusa and product. 

    const presentationInfo = await briefcase.queryRecordHelper(objectName, fields, whereClause, sortClause, limit); // save it in a global variable so that it is available throughout script

    return presentationInfo.Clm_Presentation_vod__c;
  },
  getSlidesByPresId: async (presentationData, currentPresentationInfo) => {
    // Call to get all clm presentations slides based on the id from the previous call. 
    let keyMessageArray = [];
    const objectName = "Clm_Presentation_Slide_vod__c";
    const fields = ["Name", "Id", "Key_Message_vod__c", "Clm_Presentation_vod__c", "Display_Order_vod__c"];
    const sortClause = [];
    const limit = ""; // loops through presentations array from the preivous call, using that value in the query to pull the CLM Slide data

    for (let i = 0; i < presentationData.length; i++) {
      let whereClause = `WHERE Clm_Presentation_vod__c = '${presentationData[i].Id}'`;
      const data = await briefcase.queryRecordHelper(objectName, fields, whereClause, sortClause, limit); // loops through data, and formats it pushes to a temp array

      for (let index = 0; index < data.Clm_Presentation_Slide_vod__c.length; index++) {
        const updatedData = {
          Clm_Presentation_vod__c: data.Clm_Presentation_Slide_vod__c[index].Clm_Presentation_vod__c,
          Key_Message_vod__c: data.Clm_Presentation_Slide_vod__c[index].Key_Message_vod__c,
          Display_Order_vod__c: data.Clm_Presentation_Slide_vod__c[index].Display_Order_vod__c
        };
        keyMessageArray.push(updatedData);
      }
    } // compare the current presentation array id to the clm slide keys in the keyMessageArray. And add that data to the presentation objects


    await briefcase.addConnectionId(keyMessageArray, currentPresentationInfo, presentationData);
  },
  addConnectionId: async (keyMessageArray, currentPresentationInfo, presentationData) => {
    // takes the current presentations and loops through, adds a keyMessageData property and loops through the key messages from the clm objects. if the key message matches the id from the presentation, it adds the data to that object.
    for (let i = 0; i < presentationData.length; i++) {
      presentationData[i].keyMessageData = []; // loops through and adds a keyMessageData property

      keyMessageArray.forEach(dataObj => {
        if (dataObj.Clm_Presentation_vod__c.includes(presentationData[i].Id)) {
          // check to see if the presentation includes the same id, pushes to the property we just added above
          presentationData[i].keyMessageData.push(dataObj);
        }
      });
    }

    await briefcase.getKeyMessage(presentationData, currentPresentationInfo);
  },
  getKeyMessage: async (presentationData, currentPresentationInfo) => {
    // calls to get all key messages based off of what is in the global presentation Data
    const keyMessageObjects = [];
    const objectName = "Key_Message_vod__c";
    const fields = ["Name", "Id", "Vault_DNS_vod__c", "Slide_Version_vod__c", "Status_vod__c", "Media_File_Name_vod__c"];
    const sortClause = [];
    const limit = "";

    for (let i = 0; i < presentationData.length; i++) {
      for (let index = 0; index < presentationData[i].keyMessageData.length; index++) {
        let whereClause = `WHERE Id = '${presentationData[i].keyMessageData[index].Key_Message_vod__c}' AND Status_vod__c = '${currentPresentationInfo.status}' AND Product_vod__c = '${currentPresentationInfo.product}'`;
        const data = await briefcase.queryRecordHelper(objectName, fields, whereClause, sortClause, limit);
        const objJoin = {
          'keyMessageData': data.Key_Message_vod__c[0],
          'keyMessageId': presentationData[i].keyMessageData[index]
        };
        keyMessageObjects.push(objJoin);
      }
    }

    return briefcase.connectingKeyMessageId(keyMessageObjects, presentationData);
  },
  connectingKeyMessageId: async (keyMessageObjects, presentationData) => {
    const formattedDataArray = [];

    for (let index = 0; index < keyMessageObjects.length; index++) {
      const formattedData = {
        keyMessageId: keyMessageObjects[index].keyMessageId.Key_Message_vod__c,
        displayOrder: keyMessageObjects[index].keyMessageId.Display_Order_vod__c,
        slideVersion: keyMessageObjects[index].keyMessageData.Slide_Version_vod__c,
        mediaFileName: keyMessageObjects[index].keyMessageData.Media_File_Name_vod__c,
        status: keyMessageObjects[index].keyMessageData.Status_vod__c,
        vaultUrl: keyMessageObjects[index].keyMessageData.Vault_DNS_vod__c,
        name: keyMessageObjects[index].keyMessageData.Name,
        presentationId: keyMessageObjects[index].keyMessageId.Clm_Presentation_vod__c
      };
      formattedDataArray.push(formattedData);

      for (let i = 0; i < presentationData.length; i++) {
        const tempArray = [];
        presentationData[i].keyMessages = [];

        if (formattedData.presentationId.includes(presentationData[i].Id)) {
          tempArray.push(formattedData);
        }
      }

      ;
    }

    formattedDataArray.forEach(item => {
      for (let i = 0; i < presentationData.length; i++) {
        if (item.presentationId.includes(presentationData[i].Id)) {
          presentationData[i].keyMessages.push(item);
        }
      }
    });
    return briefcase.cleanDataOutput(presentationData);
  },
  cleanDataOutput: async presentationData => {
    const cleanPublicData = [];
    presentationData.forEach(presentation => {
      const data = {
        "presentationName": presentation.Name,
        "presentationId": presentation.Presentation_Id_vod__c,
        "status": presentation.Status_vod__c,
        "keyMessages": []
      };
      presentation.keyMessages.forEach(keyMessage => {
        const keyMessageData = {
          "keyMessageName": keyMessage.name,
          "keyMessageStatus": keyMessage.status,
          "keyMessageVersion": keyMessage.slideVersion,
          "mediaFileName": keyMessage.mediaFileName,
          "displayOrder": keyMessage.displayOrder
        };
        data.keyMessages.push(keyMessageData);
      });
      cleanPublicData.push(data);
    });
    localStorage.setItem("presentationData", JSON.stringify(cleanPublicData));
  },
  getDataFromLocalStorage: async () => {
    // returns an array of objects
    // pulls and parses the data from local storage. Data is coming from briefcase engine. 
    return JSON.parse(localStorage.getItem('presentationData'));
  },

  /* 
    Returns Array of Objects (All available presentations data based off of product and status of current iva presentation)
    - Checks if data is in local storage, if it isn't initiate the engine script. Else return the data parsed from local storage
  */
  init: async () => {
    if (!localStorage.getItem('presentationData')) {
      let currentPresentationData = !undefined ? await briefcase.getCurrentPresentationData() : undefined;

      if (currentPresentationData != undefined) {
        await briefcase.getSlidesByPresId(await briefcase.getAllPresentationData(currentPresentationData), currentPresentationData);
      }
    }

    if (briefcase.data == null) {
      briefcase.data = await briefcase.getDataFromLocalStorage();
    }
  }
}; // make sure it is available to developer, they don't need to know where info is coming from. 
// Output try/catch
// lag in data call