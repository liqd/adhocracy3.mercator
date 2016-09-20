Refactoring & Clean Code
========================

Introduction
------------

After changing code (or tests) it must be better than before to ensure
*Extensibility* and *Maintainability* in the long run.

You should:

* Extract Class\Method\Function

* Move\Reuse\Rename\Remove

* Replace condition with polymorphism/Strategy

with the *clean code* principals in mind.

Clean Code summary
------------------

We follow mostly the rules from the chapter "Smells and hints" from the
book "Clean Code" by Robert C. Martin, 2008.
It should be read by every new developer. For a short summary you can read this
document or have a look at the cheat sheet:
http://www.planetgeek.ch/wp-content/uploads/2014/11/Clean-Code-V2.4.pdf.

Common Principles:
++++++++++++++++++

* Single Responsibility Principle (SRP): only one reason to change behavior/code
* Open Closed Principle (OCP): open for extensions (new classes,..), closed for modification
* Don't Repeat Yourself (DRY)
* Separation of Concern
* follow/create standards for naming, code structure and styles
* You ain't gonna need it (YAGNI)

Readability:
++++++++++++

* easy to understand and extend by others
* readable code instead of comments
* less code
* good placed and clear responsibility (place code where the reader expects it)

Variable naming:
++++++++++++++++

* explicit, show intention and maybe context information
* no misleading names
* distinction between concepts (get, append, add,..)

Additional guidelines:

* **do not** translate names and terms from the problem domain; **do**
  translate everything else
* **do** use singular
* **do** convert umlauts to ae, ue, …

Variables:
++++++++++

* define close to where there are uses

Function name/arguments:
++++++++++++++++++++++++

* verb with nouns (explain abstraction level and if possible arguments)
* name shouldn't be too long; using expressive named (keyword) arguments might
  help making an overly long name unnecessary
* prefer 0 or 1 arguments, at most 3
* Use kwargs for optional arguments, never use them like positional arguments
  (omitting the name)

Functions:
++++++++++

* short
* max 2 indention level
* do only "one thing"

  * one level of abstraction (can you divide it into sections? or extract a
    helper function with different name?)
  * one down story of to paragraphs (TO X do a, TO X do b,.. X == function name)
  * just one return statement (or several ones, but close together)
  * no switch statement (or at most one for each functionality/class, if unavoidable)
  * Command Query Separation (no side effects, use descriptive naming):

    * change state object
    * query information
    * change/return argument
    * create object

  * separate error handling (easier to read and to extend)

* prefer not to change the argument objects, never mutate default kwargs

Class names:
++++++++++++

* show responsibility
* explicit distinction of generic "concepts", if needed domain specific concepts
* no context information (for example domain specific suffix ("Adhocracy") or type ("String")

Classes:
++++++++

* SRP, OCP
* high cohesion: all methods should share the class variables, if not split class
* small
* private functions below first public function that depends on it

Objects:
++++++++

* data structures: direct access to variables
* objects: hide data structure, present public "behavior" methods for this objects

* procedural:

  * easy to add new functions
  * difficult to add new data structures (every functions need to check
    datatype, maybe Open/Close Principle violated

* OO with polymorphic methods:

  * easy to add new data structures
  * difficult to add new functions (need to extend all subclasses/implementer)

* Law of Demeter:

  * own variables / methods: ok
  * foreign data structures: ok
  * foreign object: use only public methods
  * no train wrecks: call().call()

Exceptions:
+++++++++++

* do not return/accept None without need or accept wrong arguments (exeption:
  ease unit tests) (makes it hard to find/debug errors)
* do not use Exception to handle special cases (use Wrapper Classes or throw
  exception)
* exception class should make it easy for the caller to handle exception, give
  contect information, hide third party errors

Third party code:
+++++++++++++++++

* make Facade to access, catch errors
* Learning Test to play around and test new versions

Unit Tests:
+++++++++++

* first draft +> test success +> refactor code and tests
* first test with simplest statement +> code +> more tests +> code,.. (only what is needed to pass test)

* clean code, Domain Specific Test+API
* structure: Given When Then
* assert one thing

System:
+++++++

* Separation of concern
* Split Creation (factories, start application) , Running (assume every thing is alread created)
