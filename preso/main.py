#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from google.appengine.ext import webapp
from google.appengine.ext.webapp import util


class MainHandler(webapp.RequestHandler):
    def get(self):
	    
        self.response.out.write("""
		<html>
		<head>
		<script type="text/javascript" src="https://www.google.com/jsapi"></script>
		<script>
	    google.load('payments_staging', '1.0', {
	    'packages': ['sandbox_config']
	    });
	  </script>
	  <script type="text/javascript">
	    var body = "eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiIwMDc5MDIyNTczNTc3N" + 
	             "jYxMjQ0MCIsImF1ZCI6Ikdvb2dsZSIsInR5cCI6Imdvb2dsZS9" + 
	             "wYXltZW50cy9pbmFwcC9pdGVtL3YxIiwiaWF0IjoxMzEyMjA3M" + 
	             "zk5LCJleHAiOjE0MTIyOTM3ODEsInJlcXVlc3QiOnsiY3VycmV" + 
	             "uY3lDb2RlIjoiVVNEIiwicHJpY2UiOiIzLjAwIiwibmFtZSI6I" + 
	             "kF2YXRhciIsInNlbGxlckRhdGEiOiJIdG1sNSIsImRlc2NyaXB" + 
	             "0aW9uIjoiQXZhdGFyIn19.u8aJEP7YBvCQwOIr4OELDRHjX0SJ" + 
	             "YKEfQq4gWiVw3FU";
	    function buy(){
	      goog.payments.inapp.buy({
	        'jwt': body,
	        'success': successHandler,
	        'failure': failureHandler
	      });
	    }
	    var successHandler = function(notification){
	      document.querySelector('#output').textContent = JSON.stringify(notification);
	    }
	    var failureHandler = function(notification){
	      document.querySelector('#output').textContent = JSON.stringify(notification);
	    }
	</script>
	</head>
	<body>
	  <button onclick="buy();">Buy</button>
	</body>
	</html>
""")


def main():
    application = webapp.WSGIApplication([('/', MainHandler)],
                                         debug=True)
    util.run_wsgi_app(application)


if __name__ == '__main__':
    main()
