// Set up event listeners for submit & stop buttons
const submitButton = document.getElementById('submit')
const stopButton = document.getElementById('stop')


var resetSignal = () => {
	abortController = new AbortController()
	globalAbortSignal = abortController.signal
}

submitButton.addEventListener('click', evt => {
	// Clear any ongoing requests, then load page
	abortController.abort()
	// create new signals
	resetSignal()

	loadPage()
})

stopButton.addEventListener('click', async (evt) => {
	// Clear any ongoing requests, then stop loading of images
	abortController.abort()

	// create new signals
	resetSignal()
	stopItAll()
})

// by UndertowTruck
// sorts all images displayed (related functions in misc.js)
sortButton.addEventListener('click', evt => {
	const allImages = document.getElementsByClassName('thumb')
	const sortFunction = getSortFunction()
	if (sortFunction == 'undefined') {
		console.log('Choose sort criteria')
		return
	}
    const sortedImages = Array.from(allImages).sort(sortFunction)
	const contentDiv = document.getElementById('content')
    sortedImages.forEach(thumb => {
        contentDiv.appendChild(thumb)
    })
})

// by UndertowTruck
// filters images based on rating
function ratingFilter(filterName, filterValue, filterElement) {
	const allImages = document.getElementsByClassName('thumb')
	// rating allowed
	if (filterElement.checked) {
		console.log(`Including ${filterName} posts`)
		for (image of allImages) {
			// display image if API data unavailable
			if (image.metadata == undefined) {
				image.style.display = 'inline-block'
				return
			}
			if (image.metadata.rating == filterValue) {
				image.style.display = 'inline-block'
			}
		}
	} else {
		console.log(`Excluding ${filterName} posts`)
		for (image of allImages) {
			// display image if API data unavailable
			if (image.metadata == undefined) {
				image.style.display = 'inline-block'
				return
			}
			if (image.metadata.rating == filterValue) {
				image.style.display = 'none'
			}
		}
	}
}

applyFilters.addEventListener('click', evt => {
	ratingFilter('explicit', 'e', explicit)
	ratingFilter('safe', 's', safe)
	ratingFilter('questionable', 'q', questionable)
})

// by UndertowTruck
// expands UI
expandUI.addEventListener('change', evt => {
	if (!expandUI.checked) {
		subUI.style.display = 'none'
	} else {
		//back to normal
		subUI.style = ''
	}
})

advancedMode.addEventListener('change', evt => {
	if (advancedMode.checked) {
		//back to normal
		settings.style = ''
	} else {
		settings.style.display = 'none'
	}
})

// by UndertowTruck
// changes stat displayed based on dropdown change
statDisplayed.addEventListener('change', evt => {
    const allImages = document.getElementsByClassName('thumb')
	for (image of allImages) {
		// only process if image has label to add value to
		if (image.getElementsByTagName('label')[0] != null) {
			displayData(image, statDisplayed.value)
		}
	}
})

// by UndertowTruck
// import button
// based on code from https://stackoverflow.com/a/40971885
importFavorites.addEventListener('change', async evt => {
	// ask user if they want to clear currently loaded thumbs (default behavior is yes)
	const shouldClearThumbs = prompt("Would you like to clear currently loaded posts before importing? Enter yes or no")?.toLowerCase();
	if (shouldClearThumbs != "no") {
		// Clear any ongoing requests, then load page
		abortController.abort()
		// create new signals
		resetSignal()
		stopItAll()
		//clear content div before loading in imported data
		content.innerHTML = ''
	}

	// now update imported files list
	for (const file of evt.target.files) {
		// Create ImportedFile object (Stop if fails)
		try {
			await importFavoritesFile(file);
		} catch (error) {
			console.error(error)
			continue
		}
		const importedFile = importedFiles[importedFiles.length-1];

		const fileName = file.name
		const importedFilesList = document.getElementById('importedFilesList');

		// add file list item element
		const listItem = document.createElement('li')
		listItem.style.position = 'relative'
		const button = document.createElement('button')
		button.type = "button"
		button.textContent = "X"
		button.classList.add('remove')


		const label = document.createElement('label')
		label.style = "position: absolute; padding: 4px; margin-left: 10px"
		label.textContent = `${fileName} (${importedFile.posts.length} posts)`

		listItem.appendChild(button)
		listItem.appendChild(label)

		importedFilesList.appendChild(listItem)

		button.addEventListener('click', async evt => {
			removeImportedFileAndThumbnails(importedFile);
			importedFilesList.removeChild(listItem);
		})
	}

	for (const importedFile of importedFiles) {
		displayImportedFile(importedFile);
	}

	// reset value (fixes bug where loading same file in again doesn't work because change event not triggered)
	importFavorites.value = "";
})

// by UndertowTruck
// export button
exportFavorites.addEventListener('click', evt => {
	exportFavoritesFile()
})


// by UndertowTruck
// filter imported images
submitImportQuery.addEventListener('click', evt => {
	const commands = get_commands(document.getElementById("importQuery").value);
    for (const thumb of Array.from(document.getElementsByClassName("thumb"))) {
		// only filter imported posts
        if (thumb.file != undefined) {
			const tags = thumb.getElementsByTagName("img")[0].title.split(" ");
			if (isMatch(tags, commands)) {
				thumb.style.display = "inline-block";
			} else {
				thumb.style.display = "none";
			}
		}
    }
})

// handles custom page requests (based on failedPageRequestHandler)
async function customPageRequestHandler(userID, pageNum) {
	const list = document.getElementById('customRequestList')

	// add button list item element to handle custom request
	const listItem = document.createElement('li')
	listItem.style.position = 'relative'

	const button = document.createElement('button')
	button.type = "button"
	button.classList.add('rerequest')
	// should be pending since request has just been made and didn't fail yet
	button.classList.add('pending')
	button.disabled = true
	
	const label = document.createElement('label')
	label.style = "position: absolute; padding: 4px; margin-left: 10px"
	label.textContent = `Currently rerequesting page ${pageNum} for user ${userID}`

	listItem.appendChild(button)
	listItem.appendChild(label)

	list.appendChild(listItem)

	// now wait for response
	// once doc requested
	await requestPage(userID, pageNum, maxRequestAttempts, globalAbortSignal).then(async doc => {
		if (doc == null) {
			// set to failure state
			button.classList.add('failure')
			button.classList.remove('pending')
			label.textContent = `Failed to request page ${pageNum} for user ${userID}`
			button.disabled = false
		} else {
			button.classList.add('success')
			button.classList.remove('pending')
			label.textContent = `Successfully requested page ${pageNum} for user ${userID}`
			// load entire document using currently inputted commands
			await loadContent(doc, get_commands(document.getElementById("tags").value), advancedMode.checked, globalAbortSignal)
			
			// fade out element code from https://stackoverflow.com/a/33424474
			const seconds = 2;
			listItem.style.transition = "opacity "+seconds+"s ease";
			listItem.style.opacity = 0;
			setTimeout(()=> {
				list.removeChild(listItem)
			}, seconds*1000)
			
			// TODO! Create X button to remove custom page request
			// Now add element to remove page
			// add delete list item element
			const deleteListItem = document.createElement('li')
			deleteListItem.style.position = 'relative'
			const deleteButton = document.createElement('button')
			deleteButton.type = "button"
			deleteButton.textContent = "X"
			deleteButton.classList.add('remove')


			const deleteLabel = document.createElement('label')
			deleteLabel.style = "position: absolute; padding: 4px; margin-left: 10px"
			deleteLabel.textContent = `Page ${pageNum} for user ${userID}`

			deleteListItem.appendChild(deleteButton)
			deleteListItem.appendChild(deleteLabel)

			list.appendChild(deleteListItem)

			button.addEventListener('click', async evt => {
				// TODO! Add function here that removes page from list of custom pages
				list.removeChild(deleteListItem);
			})
		}
	})

	button.addEventListener('click', async evt => {
		//disallow double clicks
		if (!evt.detail || evt.detail == 1) {
			button.disabled = true
			// change button class to show pending status
			button.classList.add('pending')
			button.classList.remove('failure')
			label.textContent = `Currently rerequesting page ${pageNum} for user ${userID}`
			await requestPage(userID, pageNum, maxRequestAttempts, globalAbortSignal).then(async doc => {
				if (doc == null) {
					// set to failure state
					button.classList.add('failure')
					button.classList.remove('pending')
					label.textContent = `Failed to request page ${pageNum} for user ${userID}`
					button.disabled = false
				} else {
					// success!
					button.classList.add('success')
					button.classList.remove('pending')
					label.textContent = `Successfully requested page ${pageNum} for user ${userID}`
		
					// load entire document using currently inputted commands
					console.log(doc)
					await loadContent(doc, get_commands(document.getElementById("tags").value), advancedMode.checked, globalAbortSignal)
					
					// fade out element code from https://stackoverflow.com/a/33424474
					const seconds = 2;
					listItem.style.transition = "opacity "+seconds+"s ease";
					listItem.style.opacity = 0;
					setTimeout(()=> {
						list.removeChild(listItem)
					}, seconds*1000)

					// TODO! Create X button to remove custom page request
					// Now add element to remove page
					// add delete list item element
					const deleteListItem = document.createElement('li')
					deleteListItem.style.position = 'relative'
					const deleteButton = document.createElement('button')
					deleteButton.type = "button"
					deleteButton.textContent = "X"
					deleteButton.classList.add('remove')


					const deleteLabel = document.createElement('label')
					deleteLabel.style = "position: absolute; padding: 4px; margin-left: 10px"
					deleteLabel.textContent = `Page ${pageNum} for user ${userID}`

					deleteListItem.appendChild(deleteButton)
					deleteListItem.appendChild(deleteLabel)

					list.appendChild(deleteListItem)

					button.addEventListener('click', async evt => {
						// TODO! Add function here that removes page from list of custom pages
						list.removeChild(deleteListItem);
					})
				}
			})
		}
	})
}

//by UndertowTruck
// carries out custom page request
requestCustomPage.addEventListener('click', async evt => {
	const pageNum = document.getElementById("customPage").value;
	const userID = document.getElementById("customID").value;
	await customPageRequestHandler(userID, pageNum);
})


