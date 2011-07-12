#!/usr/bin/env python
#
# Copyright 2010 Google Inc.
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

import sys
import os.path
import logging
import httplib
import urllib
import shutil
import hashlib

sys.path.insert(0, "lib")

import html5lib
from html5lib import treebuilders

def getFileContents(path): 
  if os.path.isfile(path):
    f = open(path)
    data = f.read()
    f.close()
    return data
  return None
  
def postToClosure(text):
  params = urllib.urlencode({
      'js_code': text,
      'output_info': 'compiled_code',
      'compilation_level': 'WHITESPACE_ONLY'
  })
  headers = {
      "Content-type": "application/x-www-form-urlencoded",
      "Accept": "text/plain"
  }
  conn = httplib.HTTPConnection("closure-compiler.appspot.com")
  conn.request("POST", "/compile", params, headers)
  response = conn.getresponse()
  print "Posting to closure..."
  print response.status, response.reason
  data = response.read()
  conn.close()
  return data
  
def getText(nodelist):
    rc = ""
    for node in nodelist:
        if node.nodeType == node.TEXT_NODE:
            rc = rc + node.data
    return rc

def parseHTML(base, filename):
  path = os.path.join(base, filename)
  f = open(path)
  parser = html5lib.HTMLParser(tree=treebuilders.getTreeBuilder("dom"))
  doc = parser.parse(f)
  f.close()
  return doc
  
def serializeHTML(doc, strip_whitespace=False):
  walker = html5lib.treewalkers.getTreeWalker("dom")
  stream = walker(doc)
  s = html5lib.serializer.htmlserializer.HTMLSerializer(
      omit_optional_tags=False,
      quote_attr_values=True,
      strip_whitespace=strip_whitespace)
  
  return s.render(stream)
  
def getJavaScriptElements(doc):
  scripts = doc.getElementsByTagName('script')
  return scripts

def getCSSLinkElements(doc):
  links = doc.getElementsByTagName('link')
  return [x for x in links if x.getAttribute('rel') == 'stylesheet']

def makeOutputDir(path, remove=False):
  if remove == True:
    shutil.rmtree(path, ignore_errors=True)
  if not os.path.isdir(path):
    os.mkdir(path)
  
def writeFile(path, text):
  dirname = os.path.dirname(path)
  if not os.path.isdir(dirname):
    os.makedirs(dirname)
  
  f = open(path, "w")
  f.write(text.encode( "utf-8" ))
  f.close()
  
def minimizeCSS(link_elems, src_base, tmp_base):
  css_contents = []
  for link in link_elems:
    href = link.getAttribute('href')
    path = os.path.join(src_base, href)
    contents = getFileContents(path)
    if contents is None:
      contents = ''
    css_contents.append(contents)
    link.parentNode.removeChild(link)
  return '\n'.join(css_contents)
  
def minimizeJavaScript(script_elems, src_base, tmp_base):
  script_contents = []
  for script in script_elems:
    src = script.getAttribute('src')
    path = os.path.join(src_base, src)
    contents = getFileContents(path)
    if contents is None:
      if len(script.childNodes) > 0:
        contents = getText(script.childNodes)
        src = os.path.join('js', hashlib.sha1(contents).hexdigest() + ".js")
        path = os.path.join(tmp_base, src)
        writeFile(path, contents)
      else:
        contents = ''

    if src.find('.min.') != -1:
      contents_min = contents
    else:
      min_file = src[:-3] + '.min.js'
      min_path = os.path.join(tmp_base, min_file)
      print "Looking for minimized file " + min_path
      if os.path.exists(min_path):
        contents_min = getFileContents(min_path)
      else:
        contents_min = postToClosure(contents)
        writeFile(min_path, contents_min)
        
    script_contents.append(contents_min)
    script.parentNode.removeChild(script)
  return '\n'.join(script_contents)

def copyDir(path_src, path_dst, opt_dirname=None):
  if opt_dirname is not None:
    path_src = os.path.join(path_src, opt_dirname)
    path_dst = os.path.join(path_dst, opt_dirname)

  shutil.rmtree(path_dst, ignore_errors=True)
  shutil.copytree(path_src, path_dst, symlinks=False)

if __name__ == "__main__":
  PATH_BASE = os.path.realpath('.')
  PATH_SRC_SERVER = os.path.join(PATH_BASE, 'server')
  PATH_SRC_FRONTEND = os.path.join(PATH_BASE, 'frontend')
  PATH_DST = os.path.join(PATH_BASE, 'build')
  PATH_DST_FRONTEND = os.path.join(PATH_DST, 'frontend')
  PATH_TMP = os.path.join(PATH_BASE, 'tmp')
  
  makeOutputDir(PATH_DST)
  makeOutputDir(PATH_DST_FRONTEND)
  makeOutputDir(PATH_TMP)
  
  doc = parseHTML(PATH_SRC_FRONTEND, 'index.html')
  script_elems = getJavaScriptElements(doc)
  css_elems = getCSSLinkElements(doc)
  
  copyDir(PATH_SRC_SERVER, PATH_DST)
  copyDir(PATH_SRC_FRONTEND, PATH_DST_FRONTEND, 'audio')
  copyDir(PATH_SRC_FRONTEND, PATH_DST_FRONTEND, 'css')
  copyDir(PATH_SRC_FRONTEND, PATH_DST_FRONTEND, 'img')
  copyDir(PATH_SRC_FRONTEND, PATH_DST_FRONTEND, 'js')
  copyDir(PATH_SRC_FRONTEND, PATH_DST_FRONTEND, 'video')

  script_concat = minimizeJavaScript(script_elems, PATH_SRC_FRONTEND, PATH_TMP)
  script_hash = hashlib.sha1(script_concat).hexdigest()
  filename = 'compiled-%s.js' % script_hash
  filepath = os.path.join(PATH_DST_FRONTEND, 'js', filename)
  writeFile(filepath, script_concat)
  node = doc.createElement('script')
  node.setAttribute('src', os.path.join('js', filename))
  doc.getElementsByTagName('head')[0].appendChild(node)
  
  link_concat = minimizeCSS(css_elems, PATH_SRC_FRONTEND, PATH_TMP)
  link_hash = hashlib.sha1(link_concat).hexdigest()
  filename = 'compiled-%s.css' % link_hash
  filepath = os.path.join(PATH_DST_FRONTEND, 'css', filename)
  writeFile(filepath, link_concat)
  node = doc.createElement('link')
  node.setAttribute('href', os.path.join('css', filename))
  node.setAttribute('rel', 'stylesheet')
  doc.getElementsByTagName('head')[0].appendChild(node)

  writeFile(os.path.join(PATH_DST_FRONTEND, 'index.html'), serializeHTML(doc, True))