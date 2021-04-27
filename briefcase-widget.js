const briefcase_widget = {
  init: async () => {
    // initially data is set to null
    let allPresentationData = null; // if data is null, call the function to pull the data from local storage (this is set in the briefcase-engine script). If that fails, call the init function again, to get the data as a failsafe

    if (allPresentationData == null) {
      allPresentationData = briefcase.data;
    } // check to see if data-slide-name exists, if it does, call the function to ggenerate the slide hotspots, otherwise don't initialize that functionality.


    if (document.querySelector('[data-slide-name]')) {
      await briefcase_widget.generateSlideHotspot(allPresentationData);
    } //Grab Static Briefcase Data, returns an array of presentation objects


    await briefcase_widget.generateStaticBriefcase(allPresentationData); // Grabs Dynamic Briefcase Data, returns an array of presentation objects

    await briefcase_widget.generateDynamicBriefcase(allPresentationData); // check to see if the briefcase should be concatinated. Otherwise generate the briefcase lists as normal  
    // using dynamic data from previous call, generate widget
  },
  generateDynamicBriefcase: async allPresentationData => {
    const attributeVal = 'data-briefcase-dynamic'; // returns an array of objects
    // checks if there is a dynamic attribute on slide and initializes the main functionalitty for the dynamic briefcase.
    if (document.querySelector(`[${attributeVal}]`)) {
    // returns an array of strings
    // finds the data-briefcase-dynamic attribute and pulls the value and formats as to what is required. 
      const dynamicBriefcaseElements = document.querySelector(`[${attributeVal}]`) ;

      const dynamicBriefcaseQuery = await briefcase_widget.generateBriefcaseQuery(dynamicBriefcaseElements, attributeVal); 
      // returns an array of objects
      // compares all presentationData to the query and returns the array of required presentation objects

      const dynamicBriefcase = await briefcase_widget.briefcaseCustomSearch(dynamicBriefcaseQuery, allPresentationData); // sorts the items based off of the presentation id number. If it doesn't have a number it should be returned as one of the last in the array. 

      if (dynamicBriefcase.length == 0) {
        // @ERROR here
        return new Error(`Failed to get presentation ${dynamicBriefcaseQuery}`)
      }

      const dynamicBriefcaseData = await briefcase_widget.sortBriefcaseItems(dynamicBriefcase);

      return await briefcase_widget.createBriefcaseWidget(dynamicBriefcaseData, attributeVal); // using statiic data from previous call, generate widget
    }
  },
  generateStaticBriefcase: async allPresentationData => {
    const attributeVal = 'data-briefcase-static';

    if (document.querySelector(`[${attributeVal}]`)) {
      const staticBriefcaseElements = document.querySelector(`[${attributeVal}]`).getAttribute(`[${attributeVal}]`) != "" ? document.querySelector(`[${attributeVal}]`) : null;
      // returns array
      // required for static briefcase to work. Grabs the query terms, and compares them to creates an array of strings. 

      const staticBriefcaseQuery = await briefcase_widget.generateBriefcaseQuery(staticBriefcaseElements, attributeVal); 
      // returns array of objects
      // takes in the term array from the previous call and compares them to the presentation data. Returns an array of matching presentation objects. 
      const validPresentations = await briefcase_widget.validateData(staticBriefcaseQuery, allPresentationData, "presentationId");
      return briefcase_widget.createStaticBriefcaseWidget(validPresentations, attributeVal);
    }
  },
  generateBriefcaseQuery: async (briefcaseElements, attributeName) => {
      // returns an array of strings
      // grabs dynamic briefcase search query string and returns it as an array
    if(briefcaseElements.getAttribute(attributeName) === "") {
      // @ERROR
      console.warn(`${attributeName} does not have a value`)
    }
    return briefcaseElements.getAttribute(attributeName);
  },
  briefcaseCustomSearch: (termValue, allPresentationData) => {
    // returns an array of presentation objects matching the term defined in the HTML
    return allPresentationData.filter((presentations) => {
        return presentations.presentationId.includes(termValue);
    })
  },
  cleanArray: menuData => {
    // returns as an array of objects
    // removes all duplicates
    return menuData.filter((item, pos, self) => {
      return self.indexOf(item) == pos;
    });
  },
  createStaticBriefcaseWidget: menuQuery => {
    const element = document.querySelector('[data-briefcase-static]');
    const list = document.createElement('ul');
    element.appendChild(list);
    list.classList.add('briefcase-list');
    menuQuery.keyMessages.forEach(keyMessage => {
      const listItem = document.createElement('li');
      listItem.classList.add('list-item');
      const listText = document.createTextNode(keyMessage.keyMessageName);
      listItem.setAttribute('data-slide', keyMessage.mediaFileName);
      listItem.setAttribute('data-presentation', menuQuery.presentationId);
      listItem.append(listText);
      list.append(listItem);
      document.addEventListener('touchstart', e => {
        if (e.target.classList.contains('list-item')) {
          const slidePresentation = e.target.getAttribute('data-presentation'),
                slidePath = e.target.getAttribute('data-slide');
          console.log(`Presentation ${slidePresentation}`);
          console.log(`Slide: ${slidePath}`);
          com.veeva.clm.gotoSlide(slidePath, slidePresentation);
        };
      });
    });
  },
  createBriefcaseWidget: async (briefcaseItems, briefcaseType) => {
    // creates actual widget for dynamic assets (based on the prefix in the data-briefcase-dynamic attribute)
    const element = document.querySelectorAll(`[${briefcaseType}]`);
    element.forEach(async briefcase => {
      const list = document.createElement('ul');
      briefcase.appendChild(list);
      list.classList.add('briefcase-list');
      briefcaseItems.forEach(briefcaseItem => {
        if (briefcaseType == "data-briefcase-static") {
          briefcaseItem.keyMessages.forEach(keyMessage => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-item');
            const listText = document.createTextNode(keyMessage.keyMessageName); // ensures the first slide in the presentation is always the hotspot

            listItem.setAttribute('data-slide', keyMessage.mediaFileName);
            listItem.setAttribute('data-presentation', briefcaseItem.presentationId);
            listItem.append(listText);
            list.append(listItem);
            document.addEventListener('touchstart', e => {
              if (e.target.classList.contains('list-item')) {
                const slidePresentation = e.target.getAttribute('data-presentation'),
                      slidePath = e.target.getAttribute('data-slide');
                console.log(`Presentation ${slidePresentation}`);
                console.log(`Slide: ${slidePath}`);
                com.veeva.clm.gotoSlide(slidePath, slidePresentation);
              }

              ;
            });
          });
        } else {
          const listItem = document.createElement('li');
          listItem.classList.add('list-item');
          const listText = document.createTextNode(briefcaseItem.presentationName); // ensures the first slide in the presentation is always the hotspot

          const firstSlide = briefcaseItem.keyMessages.find(slide => {
            return slide.displayOrder === 1;
          });
          listItem.setAttribute('data-slide', firstSlide.mediaFileName);
          listItem.setAttribute('data-presentation', briefcaseItem.presentationId);
          listItem.append(listText);
          list.append(listItem);
          document.addEventListener('touchstart', e => {
            if (e.target.classList.contains('list-item')) {
              const slidePresentation = e.target.getAttribute('data-presentation'),
                    slidePath = e.target.getAttribute('data-slide');
              console.log(`Presentation ${slidePresentation}`);
              console.log(`Slide: ${slidePath}`);
              com.veeva.clm.gotoSlide(slidePath, slidePresentation);
            }

            ;
          });
        }
      });
    });
  },
  sortBriefcaseItems: async briefcaseItems => {
    // Sorts dynamic briefcase items based on presentation id number. If the there is no number it will be tacked on to the end of the presentation array 
    const indexArray = [];
    briefcaseItems.forEach(briefcaseItem => {
      const briefcaseIndex = briefcaseItem.presentationId.match(/(\d+)/);

      if (briefcaseIndex != null) {
        const index = briefcaseIndex[0];
        indexArray.push(parseInt(index));
      } else {
        return;
      }
    });
    return briefcaseItems.sort((briefcaseItem, indexArray) => {
      return briefcaseItem - indexArray;
    });
  },
  validateData: async (value, array, key) => {
    // validates a value based off of an array, 
    // value = String
    // array = Array to compare against
    // key = String, Key in the array we are looking to compare 

    const isValid = array.find(item => {
      return item[key] === value;
    });
    if(isValid != undefined) {
      return isValid;
    } else {
      throw new Error(`Cannot find ${key} matching ${value}`);
    }
  },
  logs: () => {

  },
  generateSlideHotspot: async allPresentationData => {
    // Gets all elements that will need to have a hotspot created
    const hotspotElements = document.querySelectorAll('[data-slide-name]');
    // for each hotspot we will want to validate html values
    hotspotElements.forEach(async (hotspot) => {
      // save attribute values for the hotspot in variables
      const slideName = hotspot.getAttribute('data-slide-name'),
            presentationId = hotspot.getAttribute('data-presentation');

      // start with the presentation, and call the validateData function. Pass in the id we are looking for (from HTML), all presentation data, and the 'key' of data we need to compare against. This will return the presentation object required for the hotspot to be created.
      const validPresentations = await briefcase_widget.validateData(presentationId, allPresentationData, "presentationId");

      // using ONLY the valid presentations from above, validate slide name using the same function as before. This will return key message objects that are valid only. Will throw error if name does not exist. 
      const validSlide = await briefcase_widget.validateData(slideName, validPresentations.keyMessages, "keyMessageName");
      // Any valid slides, will grab the media file name and set the attribute to generate the hotspot functionality. 
      hotspot.setAttribute('data-slide', validSlide.mediaFileName);

      // to be integrated into the hotspot.js file already in boilerplate.
      document.addEventListener('touchstart', e => {
        if (e.target.hasAttribute('data-slide-name')) {
          const slidePresentation = e.target.getAttribute('data-presentation'),
                slidePath = e.target.getAttribute('data-slide');
          com.veeva.clm.gotoSlide(slidePath, slidePresentation);
        };
      });
    });
  }
};