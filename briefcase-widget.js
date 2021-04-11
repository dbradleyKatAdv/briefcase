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
      const dynamicBriefcaseElements = document.querySelectorAll(`[${attributeVal}]`);
      if(dynamicBriefcaseElements[0].getAttribute('data-briefcase-dynamic') != "") {
        const dynamicBriefcaseQuery = await briefcase_widget.generateBriefcaseQuery(dynamicBriefcaseElements, attributeVal); // returns an array of objects
        // compares all presentationData to the query and returns the array of required presentation objects
        const dynamicBriefcase = await briefcase_widget.briefcaseCustomSearch(dynamicBriefcaseQuery, allPresentationData); // sorts the items based off of the presentation id number. If it doesn't have a number it should be returned as one of the last in the array. 
        if(dynamicBriefcase != null) {
          const dynamicBriefcaseData = await briefcase_widget.sortBriefcaseItems(dynamicBriefcase);
          return await briefcase_widget.createBriefcaseWidget(dynamicBriefcaseData, attributeVal); // using statiic data from previous call, generate widget
        } else {
          return console.warn(`${attributeVal} doesn't return any results.`)
        }
      } else {
         return console.warn(`${attributeVal} does not have a value.`);
      }
    }
  },
  generateStaticBriefcase: async allPresentationData => {
    const attributeVal = 'data-briefcase-static';

    if (document.querySelector(`[${attributeVal}]`)) {
      const staticBriefcaseElements = document.querySelectorAll(`[${attributeVal}]`); // returns array
      // required for static briefcase to work. Grabs the query terms, and compares them to creates an array of strings. 

      const staticBriefcaseQuery = await briefcase_widget.generateBriefcaseQuery(staticBriefcaseElements, attributeVal); // returns array of objects
      // takes in the term array from the previous call and compares them to the presentation data. Returns an array of matching presentation objects. 
      const staticBriefcaseData = await briefcase_widget.briefcaseCustomSearch(staticBriefcaseQuery, allPresentationData);
      if(staticBriefcaseData != null) {
        return briefcase_widget.createBriefcaseWidget(staticBriefcaseData, attributeVal);
      } else {
        return console.warn(`${attributeVal} doesn't return any results.`)
      }
    }
  },
  generateBriefcaseQuery: async (briefcaseElements, attributeName) => {
    // returns an array of strings
    // grabs dynamic briefcase search query string and returns it as an array
    for (let index = 0; index < briefcaseElements.length; index++) {
      return [briefcaseElements[index].getAttribute(attributeName)];
    }
  },
  briefcaseCustomSearch: (termArray, allPresentations) => {
    // returns an array of presentation objects matching the term defined in the HTML
    const requiredPresentations = [];
    termArray.forEach(term => {
      const searchedId = briefcase_widget.search(term, allPresentations);
      requiredPresentations.push(searchedId);
    });
  
    if (requiredPresentations[0] === undefined) {
      console.log(new Error(`No presentations found matching ${termArray[0]}`));
      return null;
    } else {
      return requiredPresentations[0];  
    }
  },
  search: (term, presentations) => {
    // returns an array of objects
    // takes the turn and compares it to the presentations. Pushes each value to an array
    const searchArray = [];
    presentations.filter(value => {
      if (value.presentationId.includes(term)) {
          searchArray.push(value);
      }
    }); // returns an array of objects
    // filters out all duplicates
    if(searchArray.length == 0) {
      return console.log(new Error(`No presentationIds match: ${term}`))
    }
    var cleanData = briefcase_widget.cleanArray(searchArray);
    return cleanData;
  },
  cleanArray: menuData => {
    // returns as an array of objects
    // removes all duplicates
    return menuData.filter((item, pos, self) => {
      return self.indexOf(item) == pos;
    });
  },
  createStaticBriefcaseWidget: menuQuery => {
    const element = document.querySelectorAll('[data-briefcase-static]');
    element.forEach(menu => {
      if (menuQuery.length == 1) {
        const list = document.createElement('ul');
        menu.appendChild(list);
        list.classList.add('briefcase-list');
        menuQuery.forEach(presentation => {
          presentation.keyMessages.forEach(item => {
            const listItem = document.createElement('li');
            listItem.classList.add('list-item');
            const listText = document.createTextNode(item.keyMessageName);
            listItem.setAttribute('data-slide', item.mediaFileName);
            listItem.setAttribute('data-presentation', presentation.presentationId);
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
        });
      }
    });
  },
  createBriefcaseWidget: async (briefcaseItems, briefcaseType) => {
    // creates actual widget for dynamic assets (based on the prefix in the data-briefcase-dynamic attribute)
    const element = document.querySelectorAll(`[${briefcaseType}]`);
    element.forEach(async briefcase => {
      const list = document.createElement('ul');
      briefcase.appendChild(list);
      list.classList.add('briefcase-list');
      briefcaseItems.forEach((briefcaseItem) => {
        if(briefcaseType == "data-briefcase-static") {
          briefcaseItem.keyMessages.forEach((keyMessage) => {
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
              };
            });
          })
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
            };
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
  generateSlideHotspot: async presentationData => {
    // need to check, if presentation is wrong
    // for hotspot, grabs the data and generates the actual hotspot with append information  
    const requiredSlides = document.querySelectorAll('[data-slide-name]');
    requiredSlides.forEach(hotspot => {
      const dataSlide = hotspot.getAttribute('data-slide-name'),
            dataPresentation = hotspot.getAttribute('data-presentation');
      for (let i = 0; i < presentationData.length; i++) {
        if (presentationData[i].presentationId == dataPresentation) {
          for (let ix = 0; ix < presentationData[i].keyMessages.length; ix++) {
            if (dataSlide === presentationData[i].keyMessages[ix].keyMessageName) {
              hotspot.setAttribute('data-slide', presentationData[i].keyMessages[ix].mediaFileName);
            }
          }
        } else {
          // NOTE: add in error handling to ensure that the presentation id is valid. Output warning if not available
          console.log("firing",dataPresentation, presentationData[i])
        }
      };
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