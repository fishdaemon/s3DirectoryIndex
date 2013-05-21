var S3DirectoryListing =( function() {
	function Listing() 
	{
		var _createRequestObject = function(){
			if(navigator.appName == "Microsoft Internet Explorer")
				return ActiveXObject("Microsoft.XMLHTTP");
			return new XMLHttpRequest();			
		};
		var _guessBucket = function() {
			if ( location.hostname.match(/s3-.*\.amazonaws.com/) )
				return location.hostname+location.pathname.replace(/(\/.*)\/.*/, function ( match, p1,offset,string) { return p1 });
			return location.hostname;
		};

		var _extToType = function (fileName)	{
			for ( var prop in _conf.extMap )	{
				if ( fileName.replace(/[\d\w]+\.([\d\w]+)$/,function ( match, p1, offset, string) { return p1; }).match(new RegExp(_conf.extMap[prop].join('|'))) )	
					return prop;
			}
			return "unknown";
		};
		var _getPrefix = function (){
			
				return location.pathname.replace(/^\/(([\w\d]+\/)*)([\w\d]+\.[\w\d]+)?$/, function ( match, p1,p2,offset,string){ 
					if ( ! p1 )
						return "";
					return p1;
				});
			
		};
		var _getDelimiter = function()
		{
			return _conf.delimiter;
		}
		var _getParent = function(){
			
			return _getPrefix().replace(/[\d\w]+\/$/,"");
		};
		
		
		
		var _conf={
			"extMap" : {
				"executable" : [
					"bin", "exe", "msi"
				],
				"shell-script" : [
					"sh", "bash", "py" , "rb", "pl"
				],
				"browser-script" : [
					"js"
				],
				"server-script" : [
					"php","asp", "aspx"
				],
				"document" : [
					"doc", "docx", "xsl", "xslx", "pdf"
				],
				"video" : [
					"mpg", "mpeg", "mp4", "mov", "avi", "divx"
				],
				"audio" : [
					"ogg", "flac", "mp3", "aac"
				],
				"archive" : [
					"tar" , "gz", "zip", "7z", "rar"
				],
				"image" : [
					"jpg", "jpeg", "png", "gif", "svg"
				],
				"css" : [
					"css"
				],
				"font" : [
					"ttf", "woff", "eot"
				],
				"browser-docs" : [
					"txt", "htm", "html", "xml", "ini", "conf"
				]
			},
			"delimiter" : "/",
			"target" :null,
			"s3" : {
				"endpoint" : "s3-eu-west-1.amazonaws.com",
				"bucket" : _guessBucket(),
				"protocol" : null
			}
		};

		var _handleList = function ()
		{
			if(_http.readyState != 4)
				return;
			var response = _http.responseXML;
			_files = [];
			_folders = [];			
			
			var baseUrl = location.protocol+'//'+location.hostname;
			var parent = _getParent();
			_folders.push({ "name" : "..", "url": baseUrl + _getDelimiter() + parent });
			for (var i=0; i<response.getElementsByTagName('CommonPrefixes').length; i++)
				_folders.push({ 
					"name" : response.getElementsByTagName('CommonPrefixes')[i].firstChild.firstChild.nodeValue.replace(new RegExp(_getPrefix()),'').replace(/\/$/,''), 
					"url" : baseUrl + _getDelimiter() + _getPrefix() + response.getElementsByTagName('CommonPrefixes')[i].firstChild.firstChild.nodeValue.replace(new RegExp(_getPrefix()),'').replace(/\/$/,'') 
			});
			for( i=0; i<response.getElementsByTagName('Contents').length; i++)
			{
				var file= { 
					"name" : response.getElementsByTagName('Contents')[i].getElementsByTagName('Key')[0].firstChild.data.replace(new RegExp(_getPrefix()	),''), 
					"size": response.getElementsByTagName('Contents')[i].getElementsByTagName('Size')[0].firstChild.data, 
					"lastmod" : response.getElementsByTagName('Contents')[i].getElementsByTagName('LastModified')[0].firstChild.data, 
					"url" : baseUrl + _getDelimiter() + _getPrefix() + response.getElementsByTagName('Contents')[i].getElementsByTagName('Key')[0].firstChild.data.replace(new RegExp(_getPrefix()	),''),
					"class" : _extToType(response.getElementsByTagName('Contents')[i].getElementsByTagName('Key')[0].firstChild.data.replace(new RegExp(_getPrefix()	),''))
				};
				if (file.name.replace(new RegExp(_getPrefix()),'') == '')
					continue;
				_files.push(file);

			}
			_files.sort(_getSort());
			_writeHtml();
		};
		var _getListParams = function()
		{
			return 'prefix='+_getPrefix()+'&delimiter='+_getDelimiter();
		};
		var _getSort = function()
		{
			return _sortName;
		};
		var _sortSize = function(a,b) { 
   			if(parseInt(a[1]) > parseInt(b[1])) return 1;
   			if(parseInt(a[1]) < parseInt(b[1])) return -1;
   			return 0;
 		};
		var _sortSizeDesc = function(a,b) { return (-_sortSize(a,b)); };
		var _sortLastmod = function (a,b) {
		   if(a[2] > b[2]) return 1;
		   if(a[2] < b[2]) return -1;
		   return 0;
		};
		var  _sortLastmodDesc = function (a,b) { return (-_sortLastmod(a,b)); };

		var  _sortName = function(a,b) { 
	   		if(a[0] > b[0]) return 1;
	   		if(a[0] < b[0]) return -1;
	   		return 0;
		};
		var _sortNameDesc = function(a,b) { return -sortName(a,b); };
		var _http = null;
		var _getList = function ()
		{

			if ( ! _conf.s3.protocol )
				_conf.s3.protocol = location.protocol;
			
			_http = _createRequestObject();
			_http.open('get', _conf.s3.protocol+'//'+_conf.s3.bucket+'.'+_conf.s3.endpoint+'?'+_getListParams());
			_http.onreadystatechange = _handleList; 
			_http.send(null);
		};
		var _writeHtml = function()
		{
			var d = _conf.target; 
			if ( ! d )
				return;
			var str = '<table><thead><tr><th>size</th><th>last modified</th><th>name</th></tr></thead>';
			
			for (var i=0; i<_folders.length; i++)
				str+='<tr><td></td><td></td><td>'+_makeHtmlLink(_folders[i].name, _folders[i].url,'folder')+'</td></tr>';
			for ( i=0; i<_files.length; i++)
				str+= _makeFileRow(_files[i]);
			str+='</table>'
			d.innerHTML=str;

			

		};
		var _makeFileRow = function(file)
		{
			return '<tr><td>'+file.size+'</td><td>'+file.lastmod+'</td><td>'+_makeHtmlLink(file.name, file.url, file.class)+'</td></tr>';
		}
		var _makeHtmlLink = function(name, url, class_)
		{
			return '<a class="'+class_+'" href="'+url+'">'+name+'</a>';
		};	
		this.setConfig = function ( obj )
		{
			_conf = obj;
		},
		this.getConfig =  function ( obj )
		{
			return _conf;
		},
		this.init = function ( target )
		{
			if ( target )
				_conf.target = target;
			_getList();
		}
		var _files = [];
		var _folders = [];
		return this;
	}
return {
     listing: function(){return new Listing;}
   }
}());












