# TO USE:

* `git clone https://github.com/natashadecoste/multiplayergame.git`
* `cd multiplayergame`
* `npm install`
* `npm run build`


# When you want to run for development

*  `npm start`
open a new terminal
*  `npm run dev`
navigate to localhost:3000


The terminal running npm start is running webpack and watching files for changes (with the entry point being index.js !this is important!). When files are changed, they are rebundled (js -> public/bundle.js, styles/styles.scss -> public/styles.css)



# What to do:
- always git stash -> git pull -> git stash pop to make sure your changes are applied on top of the most RECENT code
- fix conflicts before committing and pushing otherwise have a fun life dealing with that lol
- changes styles within STYLES/STYLES.SCSS NOWHERE ELSE. USE SCSS. it gets compiled to browser ready css FOR YOU. 
- format ur code


# What not to do:
- don't commit node_modules folder or public (should be set up in .gitignore for you)
- don't change any files within the public folder, these are going to be rewritten by webpack and you WILL lose EVERYTHING. LITERALLY no going back.. 

#Contributers
- Troy Kuang
- Natasha Decoste
- Nicolas Tristani
- Dragan Visekruna
- Nathan Mangaol