from setuptools import setup, find_packages

setup(name='pdf-diff',
      version='0.9.2',
      description='Finds differences between two PDF documents',
      long_description_content_type="text/markdown",
      author=u'Lak',
      author_email=u'advdsf.t@aga.com',
      license='CC0 1.0 Universal',
      packages=find_packages(),
      install_requires=[
          'fast-diff-match-patch',
          'lxml',
          'pillow',
      ],
      entry_points = {
        'console_scripts': ['pdf-diff=pdf_diff.command_line:main'],
      },
      zip_safe=False)
